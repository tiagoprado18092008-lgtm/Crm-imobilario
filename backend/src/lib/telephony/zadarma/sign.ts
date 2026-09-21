import crypto from 'crypto';

/**
 * Request signing for the Zadarma API.
 *
 * The scheme is unusual enough to be the most common source of 401s, so it
 * lives on its own and is tested in isolation:
 *
 *   sorted = the query string with parameters sorted by key
 *   sig    = base64( hmac_sha1( method + sorted + md5(sorted), secret ) )
 *   header = Authorization: <key>:<sig>
 *
 * Two details catch people out. The md5 is of the *sorted query string*, not
 * of the body or the URL. And the string being signed concatenates the method
 * — the API path, e.g. "/v1/info/balance/" — with no separator at all.
 */

export type SignedRequest = {
  /** Value for the Authorization header. */
  authorization: string;
  /** Sorted query string, which must be sent exactly as signed. */
  queryString: string;
};

/**
 * Builds the sorted query string.
 *
 * Sorting is by key, and it must match byte for byte what is sent — a
 * re-encoded or reordered query produces a valid-looking signature that the
 * API rejects.
 */
export function buildQueryString(params: Record<string, unknown> = {}): string {
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => [k, String(v)] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  // RFC1738, to match PHP's http_build_query default that the official client
  // signs with: spaces are "+", not "%20". Signing one and sending the other
  // produces a valid-looking signature the API rejects.
  return entries
    .map(([k, v]) => `${rfc1738(k)}=${rfc1738(v)}`)
    .join('&');
}

/** encodeURIComponent, adjusted to RFC1738 as PHP encodes it. */
function rfc1738(value: string): string {
  return encodeURIComponent(value)
    .replace(/%20/g, '+')
    .replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

/**
 * Signs a request.
 *
 * @param method API path including its trailing slash, e.g. "/v1/statistics/"
 * @param params query parameters, in any order
 */
export function sign(
  method: string,
  params: Record<string, unknown>,
  key: string,
  secret: string,
): SignedRequest {
  const queryString = buildQueryString(params);

  // md5 of the sorted query string — not the body, not the full URL.
  const md5 = crypto.createHash('md5').update(queryString).digest('hex');

  // Concatenated with no separator between the three parts.
  const payload = `${method}${queryString}${md5}`;

  const hmac = crypto.createHmac('sha1', secret).update(payload).digest('hex');
  const signature = Buffer.from(hmac).toString('base64');

  return { authorization: `${key}:${signature}`, queryString };
}

/**
 * Constant-time comparison, for verifying a signature we receive.
 *
 * `===` on secrets leaks their contents through timing, so the comparison is
 * length-checked first and then constant-time.
 */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
