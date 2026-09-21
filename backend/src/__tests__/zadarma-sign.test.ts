import crypto from 'crypto';
import { sign, buildQueryString, safeEqual } from '../lib/telephony/zadarma/sign';

/**
 * Zadarma request signing.
 *
 * Section 9.3 calls this the number-one source of 401s, so the algorithm is
 * pinned against an independent reimplementation of the official PHP client
 * rather than against itself. Two details do the damage: the hmac is hex
 * encoded *before* base64, and the query string is RFC1738 (spaces as "+"),
 * matching PHP's http_build_query.
 */

const KEY = 'test_key_abc123';
const SECRET = 'test_secret_xyz789';

/** The PHP client's algorithm, written out independently. */
function referenceSign(method: string, sortedQuery: string, secret: string): string {
  const md5 = crypto.createHash('md5').update(sortedQuery).digest('hex');
  const hmacHex = crypto
    .createHmac('sha1', secret)
    .update(method + sortedQuery + md5)
    .digest('hex');
  return Buffer.from(hmacHex).toString('base64');
}

describe('buildQueryString', () => {
  it('sorts parameters by key, whatever order they arrive in', () => {
    expect(buildQueryString({ zebra: '1', alpha: '2', middle: '3' })).toBe(
      'alpha=2&middle=3&zebra=1',
    );
  });

  it('produces the same string regardless of insertion order', () => {
    const a = buildQueryString({ to: '+351912345678', from: '+351289000000' });
    const b = buildQueryString({ from: '+351289000000', to: '+351912345678' });
    expect(a).toBe(b);
  });

  it('drops null and undefined rather than sending them as empty', () => {
    expect(buildQueryString({ a: '1', b: null, c: undefined, d: '2' })).toBe('a=1&d=2');
  });

  it('keeps an explicit empty string, which is not the same as absent', () => {
    expect(buildQueryString({ a: '', b: '1' })).toBe('a=&b=1');
  });

  it('encodes spaces as "+" to match PHP http_build_query', () => {
    // %20 here would sign one string and send another.
    expect(buildQueryString({ name: 'Clínica São João' })).toContain('+S');
    expect(buildQueryString({ name: 'a b' })).toBe('name=a+b');
  });

  it('percent-encodes the plus in an E.164 number', () => {
    expect(buildQueryString({ to: '+351912345678' })).toBe('to=%2B351912345678');
  });

  it('is empty for no parameters', () => {
    expect(buildQueryString({})).toBe('');
    expect(buildQueryString()).toBe('');
  });
});

describe('sign', () => {
  it('matches the reference implementation', () => {
    const params = { from: '+351289000000', to: '+351912345678' };
    const { authorization, queryString } = sign('/v1/request/callback/', params, KEY, SECRET);
    expect(authorization).toBe(`${KEY}:${referenceSign('/v1/request/callback/', queryString, SECRET)}`);
  });

  it('matches the reference for a request with no parameters', () => {
    const { authorization, queryString } = sign('/v1/info/balance/', {}, KEY, SECRET);
    expect(queryString).toBe('');
    expect(authorization).toBe(`${KEY}:${referenceSign('/v1/info/balance/', '', SECRET)}`);
  });

  it('base64-encodes the hex hmac, not its raw bytes', () => {
    // Decoding the signature must yield 40 hex characters. Signing the raw
    // digest instead is the mistake that produces a plausible 401.
    const { authorization } = sign('/v1/info/balance/', {}, KEY, SECRET);
    const decoded = Buffer.from(authorization.split(':')[1], 'base64').toString('utf8');
    expect(decoded).toMatch(/^[0-9a-f]{40}$/);
  });

  it('puts the key before the colon', () => {
    const { authorization } = sign('/v1/info/balance/', {}, KEY, SECRET);
    expect(authorization.startsWith(`${KEY}:`)).toBe(true);
  });

  it('returns the query string it signed, so the caller sends the same bytes', () => {
    const { queryString } = sign('/v1/statistics/', { end: '2026-09-30', start: '2026-09-01' }, KEY, SECRET);
    expect(queryString).toBe('end=2026-09-30&start=2026-09-01');
  });

  it('changes the signature when the method changes', () => {
    const a = sign('/v1/info/balance/', { x: '1' }, KEY, SECRET).authorization;
    const b = sign('/v1/statistics/', { x: '1' }, KEY, SECRET).authorization;
    expect(a).not.toBe(b);
  });

  it('changes the signature when the secret changes', () => {
    const a = sign('/v1/info/balance/', {}, KEY, SECRET).authorization;
    const b = sign('/v1/info/balance/', {}, KEY, 'another_secret').authorization;
    expect(a).not.toBe(b);
  });

  it('is stable across calls with the same input', () => {
    const params = { to: '+351912345678' };
    expect(sign('/v1/request/callback/', params, KEY, SECRET).authorization).toBe(
      sign('/v1/request/callback/', params, KEY, SECRET).authorization,
    );
  });
});

describe('safeEqual', () => {
  it('accepts identical strings', () => {
    expect(safeEqual('token-abc', 'token-abc')).toBe(true);
  });

  it('rejects different strings and different lengths', () => {
    expect(safeEqual('token-abc', 'token-abd')).toBe(false);
    expect(safeEqual('short', 'much-longer-value')).toBe(false);
    expect(safeEqual('', 'x')).toBe(false);
  });
});
