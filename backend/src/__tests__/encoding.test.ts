import iconv from 'iconv-lite';
import { decodeBuffer, looksLikeMojibake, repairMojibake } from '../lib/encoding';

/**
 * The names in the audit are the fixtures: "GonÃ§alves", "ClÃ­nica",
 * "SERVIÃOS MÃDICOS". Getting these right at import is what stops the damage
 * reaching an email or a proposal.
 */

const DOUBLE_ENCODED = 'GonÃ§alves';
const CORRECT = 'Gonçalves';

describe('looksLikeMojibake', () => {
  it('spots double-encoded text from the existing data', () => {
    expect(looksLikeMojibake(DOUBLE_ENCODED)).toBe(true);
    expect(looksLikeMojibake('ClÃ­nica Dentária')).toBe(true);
  });

  it('leaves correct Portuguese alone', () => {
    expect(looksLikeMojibake(CORRECT)).toBe(false);
    expect(looksLikeMojibake('Clínica de Fisioterapia, São João')).toBe(false);
    expect(looksLikeMojibake('Ação, coração, José')).toBe(false);
  });
});

describe('repairMojibake', () => {
  it('recovers the intended characters', () => {
    expect(repairMojibake(DOUBLE_ENCODED)).toBe(CORRECT);
    expect(repairMojibake('ClÃ­nica')).toBe('Clínica');
  });

  it('does not touch text that is already correct', () => {
    // Running the repair on clean text is how good accents get destroyed.
    for (const text of [CORRECT, 'Clínica', 'São João', 'Ação']) {
      expect(repairMojibake(text)).toBe(text);
    }
  });

  it('is idempotent, so running an import twice is safe', () => {
    const once = repairMojibake(DOUBLE_ENCODED);
    expect(repairMojibake(once)).toBe(once);
  });
});

describe('decodeBuffer', () => {
  it('decodes UTF-8', () => {
    const { text } = decodeBuffer(Buffer.from('Clínica Gonçalves', 'utf8'));
    expect(text).toBe('Clínica Gonçalves');
  });

  it('decodes a UTF-8 file with a BOM without leaking the marker', () => {
    const buf = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('Ação', 'utf8')]);
    const { text, encoding } = decodeBuffer(buf);
    expect(text).toBe('Ação');
    expect(encoding).toContain('BOM');
  });

  it('decodes the windows-1252 an Excel export produces', () => {
    const buf = iconv.encode('Clínica São João', 'windows-1252');
    const { text } = decodeBuffer(buf);
    expect(text).toBe('Clínica São João');
  });

  it('repairs a file that was already double-encoded before export', () => {
    const buf = Buffer.from(DOUBLE_ENCODED, 'utf8');
    const { text, repaired } = decodeBuffer(buf);
    expect(text).toBe(CORRECT);
    expect(repaired).toBe(true);
  });

  it('reports no repair for a clean file', () => {
    const { repaired } = decodeBuffer(Buffer.from('Clínica Gonçalves', 'utf8'));
    expect(repaired).toBe(false);
  });
});
