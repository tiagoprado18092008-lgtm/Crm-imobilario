import iconv from 'iconv-lite';
import { parseCsv, suggestMapping } from '../modules/leads/leads.import';

/**
 * Parsing and column mapping are pure, so they are tested without a database.
 * The fixtures are the shapes the clinic lists actually arrive in: semicolons
 * from a Portuguese Excel, windows-1252 bytes, and headers in Portuguese.
 */

describe('parseCsv', () => {
  it('reads a semicolon-delimited file, which is what Excel emits here', () => {
    const csv = 'Empresa;Telefone;Email\nClínica Sorriso;912345678;geral@sorriso.pt';
    const { headers, rows } = parseCsv(Buffer.from(csv, 'utf8'));
    expect(headers).toEqual(['Empresa', 'Telefone', 'Email']);
    expect(rows).toHaveLength(1);
    expect(rows[0].Empresa).toBe('Clínica Sorriso');
  });

  it('reads a comma-delimited file', () => {
    const csv = 'Empresa,Telefone\nFisio Faro,289123456';
    const { headers, rows } = parseCsv(Buffer.from(csv, 'utf8'));
    expect(headers).toEqual(['Empresa', 'Telefone']);
    expect(rows[0].Telefone).toBe('289123456');
  });

  it('keeps a delimiter that appears inside a quoted field', () => {
    const csv = 'Empresa;Notas\n"Clínica A";"Rua X, nº 12; Faro"';
    const { rows } = parseCsv(Buffer.from(csv, 'utf8'));
    expect(rows[0].Notas).toBe('Rua X, nº 12; Faro');
  });

  it('unescapes doubled quotes', () => {
    const csv = 'Empresa\n"Clínica ""Sorriso"""';
    const { rows } = parseCsv(Buffer.from(csv, 'utf8'));
    expect(rows[0].Empresa).toBe('Clínica "Sorriso"');
  });

  it('recovers accents from a windows-1252 export', () => {
    const csv = 'Empresa;Cidade\nClínica São João;Faro';
    const { rows, encoding } = parseCsv(iconv.encode(csv, 'windows-1252'))
    expect(rows[0].Empresa).toBe('Clínica São João');
    expect(encoding).toMatch(/1252|8859/i);
  });

  it('repairs a file that was already double-encoded', () => {
    const csv = 'Empresa\nGonÃ§alves & Filhos';
    const { rows, repaired } = parseCsv(Buffer.from(csv, 'utf8'));
    expect(rows[0].Empresa).toBe('Gonçalves & Filhos');
    expect(repaired).toBe(true);
  });

  it('ignores blank lines rather than importing empty rows', () => {
    const csv = 'Empresa;Telefone\nA;912345678\n\n\nB;912345679\n';
    const { rows } = parseCsv(Buffer.from(csv, 'utf8'));
    expect(rows).toHaveLength(2);
  });

  it('returns nothing for an empty file', () => {
    const { headers, rows } = parseCsv(Buffer.from('', 'utf8'));
    expect(headers).toEqual([]);
    expect(rows).toEqual([]);
  });
});

describe('suggestMapping', () => {
  it('maps the Portuguese headers the lists use', () => {
    const m = suggestMapping(['Empresa', 'Telemóvel', 'E-mail', 'Concelho']);
    expect(m.companyName).toBe('Empresa');
    expect(m.phone).toBe('Telemóvel');
    expect(m.email).toBe('E-mail');
    expect(m.city).toBe('Concelho');
  });

  it('maps English headers too', () => {
    const m = suggestMapping(['Company', 'Phone', 'Email']);
    expect(m.companyName).toBe('Company');
    expect(m.phone).toBe('Phone');
    expect(m.email).toBe('Email');
  });

  it('does not map one column to two fields', () => {
    const m = suggestMapping(['Nome', 'Contacto']);
    const assigned = Object.values(m).filter(Boolean);
    expect(new Set(assigned).size).toBe(assigned.length);
  });

  it('returns null for fields the file does not have', () => {
    const m = suggestMapping(['Empresa']);
    expect(m.phone).toBeNull();
    expect(m.email).toBeNull();
  });
});
