import { parsePhoneNumberFromString } from 'libphonenumber-js';

/**
 * Phone numbers are stored in E.164 (+351…).
 *
 * The imported list arrived in every shape a spreadsheet allows — 912345678,
 * 351912345678, "+351 912 345 678", numbers with spaces and dashes — which
 * makes matching an inbound caller to a contact unreliable and dedupe on
 * import impossible. Normalising on write is what makes both work.
 */

const DEFAULT_REGION = 'PT' as const;

/**
 * Returns the number in E.164, or the trimmed input when it cannot be parsed.
 *
 * Deliberately non-throwing: a malformed number on an imported row should be
 * stored as given and flagged, not cause the row to be dropped.
 */
export function normalisePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = String(input).trim();
  if (!trimmed) return null;

  const parsed = parsePhoneNumberFromString(trimmed, DEFAULT_REGION);
  return parsed?.isValid() ? parsed.number : trimmed;
}

/** True when the number parses to a valid number for its region. */
export function isValidPhone(input: string | null | undefined): boolean {
  if (!input) return false;
  return parsePhoneNumberFromString(String(input).trim(), DEFAULT_REGION)?.isValid() ?? false;
}

/**
 * True for a Portuguese mobile, which is what cold calling reaches.
 *
 * Decided on the prefix rather than `getType()`: the default libphonenumber
 * build ships without the metadata that method needs and returns undefined for
 * every Portuguese number. The prefix is unambiguous here — 9 is mobile, 2 is
 * geographic — so the lighter build is worth keeping.
 */
export function isMobile(input: string | null | undefined): boolean {
  if (!input) return false;
  const parsed = parsePhoneNumberFromString(String(input).trim(), DEFAULT_REGION);
  if (!parsed?.isValid()) return false;
  if (parsed.country !== 'PT') {
    const type = parsed.getType();
    return type === 'MOBILE' || type === 'FIXED_LINE_OR_MOBILE';
  }
  return parsed.nationalNumber.startsWith('9');
}

/**
 * Every spelling a number might have been stored as, for matching an inbound
 * call against rows written before normalisation existed.
 */
export function phoneVariants(input: string | null | undefined): string[] {
  if (!input) return [];
  const trimmed = String(input).trim();
  const digits = trimmed.replace(/\D/g, '');
  const variants = new Set<string>([trimmed]);

  if (digits) {
    variants.add(digits);
    variants.add(`+${digits}`);
    // A Portuguese number with and without its country code.
    if (digits.startsWith('351') && digits.length === 12) {
      const local = digits.slice(3);
      variants.add(local);
      variants.add(`+${local}`);
    } else if (digits.length === 9) {
      variants.add(`351${digits}`);
      variants.add(`+351${digits}`);
    }
  }

  const normalised = normalisePhone(trimmed);
  if (normalised) variants.add(normalised);

  return [...variants];
}
