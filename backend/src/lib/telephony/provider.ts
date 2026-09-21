/**
 * Telephony abstraction.
 *
 * The CRM currently dials through Twilio on a US number, which is the single
 * biggest commercial problem in the product: Portuguese clinics do not answer
 * +1. Moving to a +351 number means swapping providers, and the swap is only
 * safe if nothing above this line knows which provider is in use.
 *
 * No route, service or component may import a provider directly. They take an
 * ITelephonyProvider and let the factory decide.
 */

export type ProviderId = 'zadarma' | 'twilio';

export type ProviderNumber = {
  /** E.164. */
  number: string;
  country: string;
  /** Geographic, mobile or toll-free. Cold calling wants mobile. */
  type: 'mobile' | 'geographic' | 'tollfree' | 'unknown';
  capabilities: { voice: boolean; sms: boolean };
  monthlyCost?: number;
  currency?: string;
};

export type NumberSpec = {
  country: string;
  type: 'mobile' | 'geographic';
  /** Area code, e.g. "289" for Faro. Providers may ignore it: Zadarma
   *  assigns Portuguese numbers at random and does not honour a request. */
  areaCode?: string;
};

export type CallState =
  | 'iniciada'
  | 'a_tocar'
  | 'atendida'
  | 'terminada'
  | 'falhada';

/** A provider event, normalised so callers never parse a provider payload. */
export type TelephonyEvent = {
  type: 'call.started' | 'call.ringing' | 'call.answered' | 'call.ended' | 'recording.ready';
  providerCallId: string;
  /** E.164 where the provider gives enough to normalise. */
  from?: string;
  to?: string;
  direction?: 'inbound' | 'outbound';
  /** Seconds of the whole call, including ringing. */
  duration?: number;
  /** Seconds actually connected — the number worth reporting on. */
  talkTime?: number;
  state?: CallState;
  /** Provider-side id for fetching the recording. Not a durable URL. */
  recordingId?: string;
  /** The extension involved, which is how a call maps to a user. */
  extension?: string;
  cost?: number;
  currency?: string;
  /** Untouched payload, stored for reconciliation and audit. */
  raw: unknown;
};

export type MakeCallOptions = {
  /** A number owned and verified on the account. Never caller-supplied. */
  fromNumber: string;
  to: string;
  /** Extension to ring, for a click-to-call that bridges to the agent. */
  extension?: string;
  userId: string;
};

export type RecordingHandle = {
  /** Temporary provider URL. Download it; do not store it. */
  url: string;
  expiresAt: Date;
};

export interface ITelephonyProvider {
  readonly id: ProviderId;

  makeCall(opts: MakeCallOptions): Promise<{ providerCallId: string }>;
  hangup(providerCallId: string): Promise<void>;

  listNumbers(): Promise<ProviderNumber[]>;
  orderNumber(spec: NumberSpec): Promise<ProviderNumber>;

  /**
   * Temporary link to a recording.
   *
   * Always download and re-host: provider storage is small (200MB free,
   * 2GB on Zadarma's Office plan) and these URLs expire.
   */
  getRecording(providerCallId: string): Promise<RecordingHandle>;
  deleteRecording(providerCallId: string): Promise<void>;

  sendSms(opts: { from: string; to: string; body: string }): Promise<{ id: string }>;
  getBalance(): Promise<{ amount: number; currency: string }>;

  /**
   * Whether a webhook request is genuine.
   *
   * Zadarma does not sign its webhooks, so its implementation falls back to a
   * secret in the path plus an IP allowlist. Returning true unconditionally is
   * never acceptable.
   */
  verifyWebhook(req: {
    headers: Record<string, unknown>;
    body: unknown;
    query: Record<string, unknown>;
    ip?: string;
    path?: string;
  }): Promise<boolean>;

  /** Normalises a payload, or null when the event is not one we act on. */
  normalizeEvent(payload: unknown): TelephonyEvent | null;
}

/** Thrown for provider failures, so callers need not know provider error shapes. */
export class TelephonyError extends Error {
  status: number;
  provider: ProviderId;
  providerCode?: string;

  constructor(provider: ProviderId, message: string, status = 502, providerCode?: string) {
    super(message);
    this.name = 'TelephonyError';
    this.provider = provider;
    this.status = status;
    this.providerCode = providerCode;
  }
}
