import {
  missingRequiredFields,
  computeRottingAt,
  isRotting,
  daysInStage,
} from '../lib/pipeline-rules';

const daysFromNow = (n: number) => new Date(Date.now() + n * 86_400_000);

describe('missingRequiredFields', () => {
  it('allows the move when a stage requires nothing', () => {
    expect(missingRequiredFields({}, null)).toEqual([]);
    expect(missingRequiredFields({}, [])).toEqual([]);
    expect(missingRequiredFields({}, undefined)).toEqual([]);
  });

  it('names the fields that are missing, so the gap can be filled', () => {
    const missing = missingRequiredFields({ value: null }, ['value', 'expectedCloseDate']);
    expect(missing.map((m) => m.field)).toEqual(['value', 'expectedCloseDate']);
    expect(missing[0].label).toBe('Valor');
  });

  it('accepts a deal that has everything', () => {
    const deal = { value: 700, expectedCloseDate: new Date(), contactId: 'c1' };
    expect(missingRequiredFields(deal, ['value', 'expectedCloseDate', 'contactId'])).toEqual([]);
  });

  it('treats zero as a real value', () => {
    // A deal genuinely worth 0 must not be blocked as though it were blank.
    expect(missingRequiredFields({ value: 0 }, ['value'])).toEqual([]);
  });

  it('treats blank and whitespace-only strings as missing', () => {
    expect(missingRequiredFields({ lostReason: '' }, ['lostReason'])).toHaveLength(1);
    expect(missingRequiredFields({ lostReason: '   ' }, ['lostReason'])).toHaveLength(1);
    expect(missingRequiredFields({ lostReason: 'Preço' }, ['lostReason'])).toEqual([]);
  });

  it('falls back to the field name when it has no label', () => {
    const missing = missingRequiredFields({}, ['campoPersonalizado']);
    expect(missing[0].label).toBe('campoPersonalizado');
  });
});

describe('computeRottingAt', () => {
  it('returns null when the stage sets no threshold', () => {
    expect(computeRottingAt(new Date(), null, null)).toBeNull();
    expect(computeRottingAt(new Date(), 0, null)).toBeNull();
  });

  it('counts the threshold from when the deal entered the stage', () => {
    const entered = new Date('2026-09-01T10:00:00Z');
    const rotsAt = computeRottingAt(entered, 7, null);
    expect(rotsAt?.toISOString().slice(0, 10)).toBe('2026-09-08');
  });

  it('does not rot a deal that has a next activity scheduled', () => {
    // Activity-based selling: a deal being worked is not going cold, however
    // long it has sat in the stage.
    expect(computeRottingAt(daysFromNow(-30), 7, daysFromNow(2))).toBeNull();
  });

  it('rots again once the scheduled activity has passed', () => {
    expect(computeRottingAt(daysFromNow(-30), 7, daysFromNow(-1))).not.toBeNull();
  });
});

describe('isRotting', () => {
  it('is false while the threshold is ahead', () => {
    expect(isRotting(daysFromNow(3))).toBe(false);
    expect(isRotting(null)).toBe(false);
    expect(isRotting(undefined)).toBe(false);
  });

  it('is true once the threshold has passed', () => {
    expect(isRotting(daysFromNow(-1))).toBe(true);
  });
});

describe('daysInStage', () => {
  it('counts whole days since the deal entered', () => {
    expect(daysInStage(daysFromNow(-5))).toBe(5);
    expect(daysInStage(new Date())).toBe(0);
  });

  it('returns zero when the timestamp is missing', () => {
    // Deals created before this field existed must not read as ancient.
    expect(daysInStage(null)).toBe(0);
    expect(daysInStage(undefined)).toBe(0);
  });
});
