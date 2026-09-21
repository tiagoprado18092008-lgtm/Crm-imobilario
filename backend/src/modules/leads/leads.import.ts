import prisma from '../../config/database';
import { withWorkspace, workspaceIdFor } from '../../lib/workspace';
import { decodeBuffer } from '../../lib/encoding';
import { normalisePhone, isValidPhone } from '../../lib/phone';

/**
 * CSV import for cold-call lists.
 *
 * This is the only door leads come in through, so it is also where data
 * hygiene lives: encoding is detected per file, phones are normalised to
 * E.164, and duplicates are rejected on the way in rather than cleaned up
 * later. Rows land as Leads, never as Opportunities — putting a raw call list
 * into the pipeline is what left 2,882 of 3,442 deals stuck in the first stage.
 */

export type ImportRow = Record<string, string>;

export type ParsedFile = {
  headers: string[];
  rows: ImportRow[];
  encoding: string;
  repaired: boolean;
};

/** Splits one CSV line, honouring quoted fields and escaped quotes. */
function splitLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      out.push(field.trim());
      field = '';
    } else {
      field += ch;
    }
  }
  out.push(field.trim());
  return out;
}

/** Portuguese exports are usually semicolon-delimited; detect rather than assume. */
function detectDelimiter(headerLine: string): string {
  const counts = [';', ',', '\t'].map((d) => ({ d, n: headerLine.split(d).length }));
  counts.sort((a, b) => b.n - a.n);
  return counts[0].n > 1 ? counts[0].d : ',';
}

export function parseCsv(buffer: Buffer): ParsedFile {
  const { text, encoding, repaired } = decodeBuffer(buffer);
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [], encoding, repaired };

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitLine(lines[0], delimiter);

  const rows = lines.slice(1).map((line) => {
    const values = splitLine(line, delimiter);
    const row: ImportRow = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? '';
    });
    return row;
  });

  return { headers, rows, encoding, repaired };
}

/** Column names seen in the clinic lists, mapped to lead fields. */
const COLUMN_HINTS: Record<string, string[]> = {
  companyName: ['empresa', 'clinica', 'clínica', 'nome da empresa', 'company', 'negocio', 'negócio', 'nome'],
  contactName: ['contacto', 'contato', 'nome do contacto', 'responsavel', 'responsável', 'contact'],
  phone: ['telefone', 'telemovel', 'telemóvel', 'phone', 'contacto telefonico', 'nº telefone', 'numero'],
  email: ['email', 'e-mail', 'correio'],
  city: ['cidade', 'localidade', 'concelho', 'city'],
  website: ['website', 'site', 'url', 'página', 'pagina'],
  sector: ['setor', 'sector', 'area', 'área', 'especialidade', 'tipo'],
  notes: ['notas', 'observacoes', 'observações', 'notes'],
};

/** Best-guess mapping from the file's headers to lead fields. */
export function suggestMapping(headers: string[]): Record<string, string | null> {
  const mapping: Record<string, string | null> = {};
  const used = new Set<string>();

  for (const [field, hints] of Object.entries(COLUMN_HINTS)) {
    const match = headers.find((h) => {
      if (used.has(h)) return false;
      const n = h.toLowerCase().trim();
      return hints.some((hint) => n === hint || n.includes(hint));
    });
    mapping[field] = match ?? null;
    if (match) used.add(match);
  }
  return mapping;
}

export type PreviewResult = {
  encoding: string;
  repaired: boolean;
  headers: string[];
  mapping: Record<string, string | null>;
  totalRows: number;
  /** First rows as they would be saved, so the mapping can be checked. */
  sample: Array<Record<string, string | null>>;
  valid: number;
  /** Rows that cannot be saved, with the reason. */
  rejected: Array<{ row: number; reason: string; value?: string }>;
  /** Rows matching something already in the workspace. */
  duplicates: Array<{ row: number; reason: string; value: string }>;
};

type MappedLead = {
  companyName: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  website: string | null;
  notes: string | null;
};

const mapRow = (row: ImportRow, mapping: Record<string, string | null>): MappedLead => {
  const get = (field: string) => {
    const col = mapping[field];
    const v = col ? (row[col] ?? '').trim() : '';
    return v.length ? v : null;
  };
  return {
    companyName: get('companyName'),
    contactName: get('contactName'),
    phone: normalisePhone(get('phone')),
    email: get('email'),
    city: get('city'),
    website: get('website'),
    notes: get('notes'),
  };
};

/**
 * Validates an import without writing anything.
 *
 * Nothing is saved until the result of this has been seen: an import that
 * silently drops or duplicates rows is worse than one that refuses to run.
 */
export async function preview(
  buffer: Buffer,
  overrides: Record<string, string | null> | undefined,
  user: any,
): Promise<PreviewResult> {
  const { headers, rows, encoding, repaired } = parseCsv(buffer);
  const mapping = { ...suggestMapping(headers), ...(overrides ?? {}) };

  const rejected: PreviewResult['rejected'] = [];
  const duplicates: PreviewResult['duplicates'] = [];
  const seenPhones = new Set<string>();
  const seenEmails = new Set<string>();

  const mapped = rows.map((r) => mapRow(r, mapping));

  // One query for the whole file rather than one per row.
  const phones = mapped.map((m) => m.phone).filter(Boolean) as string[];
  const emails = mapped.map((m) => m.email?.toLowerCase()).filter(Boolean) as string[];

  const [existingLeads, existingContacts] = await Promise.all([
    phones.length || emails.length
      ? prisma.lead.findMany({
          where: withWorkspace(user, {
            OR: [{ phone: { in: phones } }, { email: { in: emails } }],
          }),
          select: { phone: true, email: true },
        })
      : Promise.resolve([]),
    phones.length
      ? prisma.contact.findMany({
          where: withWorkspace(user, { phone: { in: phones } }),
          select: { phone: true },
        })
      : Promise.resolve([]),
  ]);

  const existingPhones = new Set([
    ...existingLeads.map((l) => l.phone).filter(Boolean),
    ...existingContacts.map((c) => c.phone).filter(Boolean),
  ] as string[]);
  const existingEmails = new Set(
    existingLeads.map((l) => l.email?.toLowerCase()).filter(Boolean) as string[],
  );

  let valid = 0;

  mapped.forEach((m, i) => {
    const rowNumber = i + 2; // 1-indexed, plus the header line

    if (!m.companyName && !m.contactName) {
      rejected.push({ row: rowNumber, reason: 'Sem nome de empresa nem de contacto' });
      return;
    }
    if (!m.phone && !m.email) {
      rejected.push({ row: rowNumber, reason: 'Sem telefone nem email' });
      return;
    }
    if (m.phone && !isValidPhone(m.phone)) {
      rejected.push({ row: rowNumber, reason: 'Telefone inválido', value: m.phone });
      return;
    }

    // Duplicates within the file itself, then against the workspace.
    if (m.phone && seenPhones.has(m.phone)) {
      duplicates.push({ row: rowNumber, reason: 'Repetido no ficheiro', value: m.phone });
      return;
    }
    if (m.email && seenEmails.has(m.email.toLowerCase())) {
      duplicates.push({ row: rowNumber, reason: 'Repetido no ficheiro', value: m.email });
      return;
    }
    if (m.phone && existingPhones.has(m.phone)) {
      duplicates.push({ row: rowNumber, reason: 'Já existe no CRM', value: m.phone });
      return;
    }
    if (m.email && existingEmails.has(m.email.toLowerCase())) {
      duplicates.push({ row: rowNumber, reason: 'Já existe no CRM', value: m.email });
      return;
    }

    if (m.phone) seenPhones.add(m.phone);
    if (m.email) seenEmails.add(m.email.toLowerCase());
    valid++;
  });

  return {
    encoding,
    repaired,
    headers,
    mapping,
    totalRows: rows.length,
    sample: mapped.slice(0, 10),
    valid,
    rejected: rejected.slice(0, 100),
    duplicates: duplicates.slice(0, 100),
  };
}

export type ImportResult = {
  imported: number;
  skipped: number;
  encoding: string;
  repaired: boolean;
};

/** Writes the rows that `preview` accepted. */
export async function commit(
  buffer: Buffer,
  opts: { mapping?: Record<string, string | null>; source?: string; ownerId?: string },
  user: any,
): Promise<ImportResult> {
  const agencyId = workspaceIdFor(user);
  const result = await preview(buffer, opts.mapping, user);
  const { rows, headers } = parseCsv(buffer);
  const mapping = { ...suggestMapping(headers), ...(opts.mapping ?? {}) };

  const rejectedRows = new Set([
    ...result.rejected.map((r) => r.row),
    ...result.duplicates.map((d) => d.row),
  ]);

  const toCreate = rows
    .map((r, i) => ({ mapped: mapRow(r, mapping), rowNumber: i + 2 }))
    .filter(({ rowNumber }) => !rejectedRows.has(rowNumber))
    .map(({ mapped }) => ({
      agencyId,
      companyName: mapped.companyName,
      contactName: mapped.contactName,
      phone: mapped.phone,
      email: mapped.email,
      notes: [mapped.notes, mapped.city && `Localidade: ${mapped.city}`, mapped.website]
        .filter(Boolean)
        .join('\n') || null,
      source: opts.source ?? 'Importação CSV',
      ownerId: opts.ownerId ?? user.id,
      state: 'NOVO' as const,
      // Due immediately: an imported list is a list to start calling.
      nextAttemptAt: new Date(),
    }));

  if (toCreate.length === 0) {
    return { imported: 0, skipped: rows.length, encoding: result.encoding, repaired: result.repaired };
  }

  const created = await prisma.lead.createMany({ data: toCreate, skipDuplicates: true });

  return {
    imported: created.count,
    skipped: rows.length - created.count,
    encoding: result.encoding,
    repaired: result.repaired,
  };
}
