/**
 * Stub for @whiskeysockets/baileys in tests.
 *
 * The real package is ESM and Jest does not transform node_modules, so any
 * test whose import chain reached the WhatsApp socket failed to parse before
 * running a single assertion — including tests about calling hours and health
 * checks, which have nothing to do with WhatsApp.
 *
 * Nothing here connects. A test that genuinely needs WhatsApp behaviour should
 * mock the surface it uses rather than lean on this.
 */

export const DisconnectReason = {
  loggedOut: 401,
  connectionClosed: 428,
  connectionLost: 408,
  restartRequired: 515,
  timedOut: 408,
} as const;

export async function fetchLatestBaileysVersion() {
  return { version: [2, 3000, 0] as [number, number, number], isLatest: true };
}

export async function fetchLatestWaWebVersion() {
  return { version: [2, 3000, 0] as [number, number, number], isLatest: true };
}

export function makeCacheableSignalKeyStore(keys: unknown) {
  return keys;
}

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Returns an inert socket: it records nothing and sends nothing. */
export default function makeWASocket() {
  return {
    ev: { on: () => undefined, off: () => undefined, process: () => undefined },
    sendMessage: async () => ({ key: { id: 'stub' } }),
    logout: async () => undefined,
    end: () => undefined,
    user: undefined,
    ws: { close: () => undefined },
  };
}
