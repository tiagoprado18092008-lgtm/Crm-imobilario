import { normalisePhone, isValidPhone, isMobile, phoneVariants } from '../lib/phone';

/**
 * Phone normalisation underpins dedupe on import and matching an inbound
 * caller to a contact, so the shapes the clinic list actually arrived in are
 * pinned here rather than assumed.
 */
describe('normalisePhone', () => {
  it('normalises the spellings a spreadsheet produces to one E.164 value', () => {
    const expected = '+351912345678';
    for (const input of [
      '912345678',
      '+351912345678',
      '351912345678',
      '+351 912 345 678',
      '912 345 678',
      '912-345-678',
      '  912345678  ',
    ]) {
      expect(normalisePhone(input)).toBe(expected);
    }
  });

  it('normalises Portuguese landlines, including Faro', () => {
    expect(normalisePhone('289123456')).toBe('+351289123456');
    expect(normalisePhone('+351 289 123 456')).toBe('+351289123456');
  });

  it('keeps an international number in its own country code', () => {
    expect(normalisePhone('+44 20 7946 0958')).toBe('+442079460958');
  });

  it('returns null for empty input rather than an empty string', () => {
    expect(normalisePhone(null)).toBeNull();
    expect(normalisePhone(undefined)).toBeNull();
    expect(normalisePhone('')).toBeNull();
    expect(normalisePhone('   ')).toBeNull();
  });

  it('keeps an unparseable value instead of dropping the row', () => {
    // An import should flag this, not silently discard the record.
    expect(normalisePhone('sem telefone')).toBe('sem telefone');
    expect(normalisePhone('123')).toBe('123');
  });
});

describe('isValidPhone', () => {
  it('accepts valid Portuguese numbers', () => {
    expect(isValidPhone('912345678')).toBe(true);
    expect(isValidPhone('289123456')).toBe(true);
  });

  it('rejects malformed input', () => {
    expect(isValidPhone('123')).toBe(false);
    expect(isValidPhone('abc')).toBe(false);
    expect(isValidPhone(null)).toBe(false);
  });
});

describe('isMobile', () => {
  it('identifies Portuguese mobiles, which is what cold calling reaches', () => {
    expect(isMobile('912345678')).toBe(true);
    expect(isMobile('+351936000000')).toBe(true);
  });

  it('does not treat a landline as a mobile', () => {
    expect(isMobile('289123456')).toBe(false);
  });
});

describe('phoneVariants', () => {
  it('covers rows written before normalisation existed', () => {
    const variants = phoneVariants('+351912345678');
    expect(variants).toEqual(expect.arrayContaining([
      '+351912345678',
      '351912345678',
      '912345678',
    ]));
  });

  it('expands a bare local number to its prefixed forms', () => {
    const variants = phoneVariants('912345678');
    expect(variants).toEqual(expect.arrayContaining([
      '912345678',
      '351912345678',
      '+351912345678',
    ]));
  });

  it('returns nothing for empty input', () => {
    expect(phoneVariants(null)).toEqual([]);
    expect(phoneVariants('')).toEqual([]);
  });
});
