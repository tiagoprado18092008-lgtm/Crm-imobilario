import { ZadarmaProvider } from './zadarma/zadarma.provider';
import { type ITelephonyProvider, type ProviderId, TelephonyError } from './provider';

export * from './provider';

/**
 * Chooses the voice provider.
 *
 * Nothing above this file names a provider. Swapping Twilio for Zadarma — the
 * point of the whole abstraction — is a change to this factory and an
 * environment variable, not a change to every call site.
 */

let cached: ITelephonyProvider | null = null;

export function getTelephonyProvider(): ITelephonyProvider {
  if (cached) return cached;

  const configured = (process.env.TELEPHONY_PROVIDER ?? 'zadarma').toLowerCase() as ProviderId;

  if (configured === 'zadarma') {
    const key = process.env.ZADARMA_KEY;
    const secret = process.env.ZADARMA_SECRET;
    if (!key || !secret) {
      throw new TelephonyError(
        'zadarma',
        'ZADARMA_KEY e ZADARMA_SECRET não estão configurados',
        500,
      );
    }
    cached = new ZadarmaProvider(key, secret, process.env.ZADARMA_WEBHOOK_TOKEN);
    return cached;
  }

  // Twilio stays reachable for SMS, but voice has moved: the US number it
  // dials from is the reason clinics do not pick up.
  throw new TelephonyError(
    configured,
    `Provider de voz "${configured}" não suportado. Usa "zadarma".`,
    500,
  );
}

/** Test seam, and for reloading after configuration changes. */
export function resetTelephonyProvider(): void {
  cached = null;
}

/** Whether voice is configured, for showing setup state in the UI. */
export function isTelephonyConfigured(): boolean {
  return Boolean(process.env.ZADARMA_KEY && process.env.ZADARMA_SECRET);
}
