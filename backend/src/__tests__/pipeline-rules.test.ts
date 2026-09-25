import {
  missingRequiredFields,
  computeRottingAt,
  isRotting,
  daysInStage,
  mapStagesByName,
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

describe('mapStagesByName', () => {
  const target = [
    { id: 't-lead', name: 'Lead Novo' },
    { id: 't-meeting', name: 'Reunião Marcada' },
    { id: 't-won', name: 'Fechado' },
  ];

  it('keeps a deal in the stage of the same name', () => {
    const map = mapStagesByName([{ id: 's-meeting', name: 'Reunião Marcada' }], target);
    expect(map.get('s-meeting')).toBe('t-meeting');
  });

  it('ignores case, accents and surrounding spaces when matching', () => {
    const map = mapStagesByName([{ id: 's', name: '  reuniao marcada ' }], target);
    expect(map.get('s')).toBe('t-meeting');
  });

  it('sends a stage with no counterpart to the first stage', () => {
    const map = mapStagesByName([{ id: 's-odd', name: 'nao atendido' }], target);
    expect(map.get('s-odd')).toBe('t-lead');
  });

  it('picks the first of two stages sharing a name', () => {
    const dupes = [
      { id: 't-a', name: 'Proposta Enviada' },
      { id: 't-b', name: 'Proposta Enviada' },
    ];
    expect(mapStagesByName([{ id: 's', name: 'Proposta Enviada' }], dupes).get('s')).toBe('t-a');
  });

  it('refuses a destination with no stages, which could not hold the deals', () => {
    expect(() => mapStagesByName([{ id: 's', name: 'Lead Novo' }], [])).toThrow();
  });
});
