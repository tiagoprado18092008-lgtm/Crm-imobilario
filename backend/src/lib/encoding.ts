import chardet from 'chardet';
import iconv from 'iconv-lite';

/**
 * Text decoding for imported files.
 *
 * The existing database is full of "GonÃ§alves" and "ClÃ­nica": latin1 bytes
 * read as UTF-8, then written back as UTF-8. Once that has happened the damage
 * is in the data, so the fix belongs here, at the point of import, rather than
 * in a repair script that has to run forever afterwards.
 */

/** Sequences that only occur when UTF-8 has been read as latin1. */
const MOJIBAKE_MARKERS = [
  'Ã£', 'Ãµ', 'Ã§', 'Ã¡', 'Ã©', 'Ã­', 'Ã³', 'Ãº', 'Ã ', 'Ã¢', 'Ãª', 'Ã´',
  'Ã‡', 'Ãƒ', 'Ã•', 'Ã\u0081', 'Ã‰', 'Ã\u008d', 'Ã“', 'Ãš', 'Â ', 'Â´',
];

/** True when the text shows signs of double-encoded UTF-8. */
export function looksLikeMojibake(text: string): boolean {
  return MOJIBAKE_MARKERS.some((m) => text.includes(m));
}

/**
 * Reverses one round of latin1/UTF-8 double encoding.
 *
 * Only applied when the result actually looks better, because running it on
 * clean text corrupts legitimate accented characters — the same mistake, in
 * the other direction, that produced the bad data in the first place.
 */
export function repairMojibake(text: string): string {
  if (!looksLikeMojibake(text)) return text;
  try {
    const repaired = iconv.decode(Buffer.from(text, 'binary'), 'utf8');
    return looksLikeMojibake(repaired) ? text : repaired;
  } catch {
    return text;
  }
}

export type DecodeResult = {
  text: string;
  /** Encoding chardet reported, or the fallback that was used. */
  encoding: string;
  /** Whether a double-encoding repair pass was applied after decoding. */
  repaired: boolean;
};

/**
 * Decodes an uploaded file to a string.
 *
 * Detection is per file rather than assumed: the clinic lists come out of
 * Excel as windows-1252 as often as UTF-8, and guessing UTF-8 is exactly how
 * the accented characters were lost.
 */
export function decodeBuffer(buffer: Buffer): DecodeResult {
  // A BOM is authoritative; chardet is a guess.
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return { text: buffer.slice(3).toString('utf8'), encoding: 'UTF-8 (BOM)', repaired: false };
  }

  const detected = chardet.detect(buffer) ?? 'UTF-8';

  // chardet reports ISO-8859-1 for windows-1252 text. They differ in the
  // 0x80-0x9F range, which is where the curly quotes and dashes Excel emits
  // live, so decoding as windows-1252 loses less.
  const encoding = /ISO-8859-1|windows-1252/i.test(detected) ? 'windows-1252' : detected;

  let text: string;
  try {
    text = iconv.decode(buffer, encoding);
  } catch {
    text = buffer.toString('utf8');
  }

  // A file can be valid UTF-8 and still contain mojibake, when the damage
  // happened before it was exported.
  const repaired = looksLikeMojibake(text);
  if (repaired) text = repairMojibake(text);

  return { text, encoding, repaired };
}
