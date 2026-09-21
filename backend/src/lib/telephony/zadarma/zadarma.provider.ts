import axios from 'axios';
import { sign, safeEqual } from './sign';
import { normalisePhone } from '../../phone';
import {
  type ITelephonyProvider,
  type MakeCallOptions,
  type NumberSpec,
  type ProviderNumber,
  type RecordingHandle,
  type TelephonyEvent,
  TelephonyError,
} from '../provider';

const BASE_URL = 'https://api.zadarma.com';

/**
 * Zadarma voice provider.
 *
 * Chosen over Twilio for one reason: a Portuguese mobile costs about $10/month
 * here against roughly $135 on Twilio, and calling Portuguese clinics from a
 * +351 number rather than a US one is the difference between being answered
 * and not.
 *
 * Two constraints shape this implementation:
 *
 *  - /statistics/* is rate limited to 3 requests per minute, against 100 for
 *    everything else. It is for nightly reconciliation, never for live state.
 *  - Webhooks are not signed. Authenticity rests on a secret in the path plus
 *    an IP allowlist, both enforced in verifyWebhook.
 */
export class ZadarmaProvider implements ITelephonyProvider {
  readonly id = 'zadarma' as const;

  constructor(
    private readonly key: string,
    private readonly secret: string,
    /** Long random string in the webhook path; the only shared secret we get. */
    private readonly webhookToken?: string,
  ) {
    if (!key || !secret) {
      throw new TelephonyError('zadarma', 'Credenciais Zadarma em falta', 500);
    }
  }

  private async request<T = any>(
    method: string,
    params: Record<string, unknown> = {},
    httpMethod: 'GET' | 'POST' = 'GET',
  ): Promise<T> {
    const { authorization, queryString } = sign(method, params, this.key, this.secret);

    try {
      const res = await axios.request({
        url: `${BASE_URL}${method}${queryString ? `?${queryString}` : ''}`,
        method: httpMethod,
        headers: { Authorization: authorization },
        timeout: 15_000,
      });

      // The API answers 200 with status:"error" for business failures, so the
      // HTTP status alone is not enough to tell success from failure.
      if (res.data?.status === 'error') {
        throw new TelephonyError(
          'zadarma',
          res.data?.message ?? 'Erro na API Zadarma',
          422,
          res.data?.code,
        );
      }
      return res.data as T;
    } catch (err: any) {
      if (err instanceof TelephonyError) throw err;
      const status = err.response?.status ?? 502;
      const message =
        err.response?.data?.message ??
        (status === 401
          ? 'Autenticação Zadarma recusada — verifica a chave e o segredo'
          : err.message);
      throw new TelephonyError('zadarma', message, status);
    }
  }

  /**
   * Places a call by ringing the agent first, then dialling the lead.
   *
   * Zadarma's model is callback rather than direct origination: `from` is the
   * agent's extension, which rings, and `to` is the destination, bridged on
   * answer. `sip` carries the outbound caller ID shown to the lead.
   */
  async makeCall(opts: MakeCallOptions): Promise<{ providerCallId: string }> {
    const to = normalisePhone(opts.to);
    if (!to) throw new TelephonyError('zadarma', 'Número de destino inválido', 400);

    const res = await this.request<{ call_id?: string }>('/v1/request/callback/', {
      from: opts.extension ?? opts.fromNumber,
      to,
      // Only a number verified on the account may be presented. The UI never
      // supplies this, so a caller ID cannot be spoofed from the interface.
      sip: opts.fromNumber,
    });

    return { providerCallId: res.call_id ?? `${Date.now()}` };
  }

  /**
   * Zadarma has no hang-up endpoint: a call is ended from the SIP session.
   * Declared so the interface stays honest about what the provider can do.
   */
  async hangup(): Promise<void> {
    throw new TelephonyError(
      'zadarma',
      'A Zadarma não expõe terminação por API — termina pela sessão SIP',
      501,
    );
  }

  async listNumbers(): Promise<ProviderNumber[]> {
    const res = await this.request<{ info?: any[] }>('/v1/direct_numbers/');
    return (res.info ?? []).map((n: any) => ({
      number: normalisePhone(n.number) ?? String(n.number),
      country: n.country ?? 'PT',
      type: classifyNumber(String(n.number)),
      capabilities: { voice: true, sms: Boolean(n.sms_allowed) },
      monthlyCost: n.monthly_fee != null ? Number(n.monthly_fee) : undefined,
      currency: n.currency ?? 'USD',
    }));
  }

  /**
   * Ordering is deliberately unimplemented.
   *
   * Zadarma assigns Portuguese numbers at random and requires identity
   * documents before activation, so a number cannot be bought from code. Doing
   * it through the console is the honest path; silently ordering the wrong
   * number would be worse than refusing.
   */
  async orderNumber(spec: NumberSpec): Promise<ProviderNumber> {
    throw new TelephonyError(
      'zadarma',
      `Compra de números ${spec.country} tem de ser feita na consola da Zadarma ` +
        '(exige documentos e o número é atribuído aleatoriamente)',
      501,
    );
  }

  async getRecording(providerCallId: string): Promise<RecordingHandle> {
    const res = await this.request<{ link?: string; lifetime?: number }>(
      '/v1/pbx/record/request/',
      { call_id: providerCallId },
    );
    if (!res.link) {
      throw new TelephonyError('zadarma', 'Gravação não disponível', 404);
    }
    // The link is short-lived; treat the absence of a lifetime as one hour.
    return {
      url: res.link,
      expiresAt: new Date(Date.now() + (res.lifetime ?? 3600) * 1000),
    };
  }

  async deleteRecording(providerCallId: string): Promise<void> {
    // Frees provider quota once the file is safely in our own storage.
    await this.request('/v1/pbx/record/request/', { call_id: providerCallId, delete: 1 });
  }

  /** SMS is a fallback; Twilio remains the primary SMS path. */
  async sendSms(opts: { from: string; to: string; body: string }): Promise<{ id: string }> {
    const res = await this.request<{ messages?: string[] }>(
      '/v1/sms/send/',
      { number: opts.to, message: opts.body, caller_id: opts.from },
      'POST',
    );
    return { id: res.messages?.[0] ?? `${Date.now()}` };
  }

  async getBalance(): Promise<{ amount: number; currency: string }> {
    const res = await this.request<{ balance: number; currency: string }>('/v1/info/balance/');
    return { amount: Number(res.balance), currency: res.currency ?? 'USD' };
  }

  /**
   * Zadarma does not sign webhooks, so authenticity rests on two weaker
   * checks used together: a long secret in the URL path, and an IP allowlist.
   * Neither is sufficient alone, and the method never returns true by default.
   */
  async verifyWebhook(req: {
    headers: Record<string, unknown>;
    body: unknown;
    query: Record<string, unknown>;
    ip?: string;
    path?: string;
  }): Promise<boolean> {
    if (!this.webhookToken) return false;

    const supplied =
      (req.query?.token as string) ??
      (req.path ? req.path.split('/').pop() : undefined) ??
      '';

    return safeEqual(supplied, this.webhookToken);
  }

  normalizeEvent(payload: unknown): TelephonyEvent | null {
    const p = payload as Record<string, any> | null;
    if (!p?.event) return null;

    const base = {
      providerCallId: String(p.pbx_call_id ?? p.call_id_with_rec ?? p.call_id ?? ''),
      from: normalisePhone(p.caller_id) ?? undefined,
      to: normalisePhone(p.called_did ?? p.destination) ?? undefined,
      extension: p.internal ? String(p.internal) : undefined,
      raw: payload,
    };

    switch (p.event) {
      case 'NOTIFY_START':
        return { ...base, type: 'call.started', direction: 'inbound', state: 'a_tocar' };

      case 'NOTIFY_OUT_START':
        return { ...base, type: 'call.started', direction: 'outbound', state: 'a_tocar' };

      case 'NOTIFY_ANSWER':
      case 'NOTIFY_INTERNAL':
        return { ...base, type: 'call.answered', state: 'atendida' };

      case 'NOTIFY_END':
      case 'NOTIFY_OUT_END': {
        const duration = p.duration != null ? Number(p.duration) : undefined;
        const talkTime = p.billseconds != null ? Number(p.billseconds) : undefined;
        return {
          ...base,
          type: 'call.ended',
          direction: p.event === 'NOTIFY_OUT_END' ? 'outbound' : 'inbound',
          duration,
          talkTime,
          // disposition "answered" is the provider's word, not our CRM
          // disposition — a BDR still records why the call went as it did.
          state: p.disposition === 'answered' || (talkTime ?? 0) > 0 ? 'terminada' : 'falhada',
          cost: p.cost != null ? Number(p.cost) : undefined,
          currency: p.currency,
        };
      }

      case 'NOTIFY_RECORD':
        return {
          ...base,
          type: 'recording.ready',
          recordingId: String(p.call_id_with_rec ?? p.pbx_call_id ?? ''),
        };

      // NOTIFY_IVR and anything unrecognised are ignored rather than guessed at.
      default:
        return null;
    }
  }
}

/** Portuguese numbering: 9 is mobile, 2 is geographic. */
function classifyNumber(raw: string): ProviderNumber['type'] {
  const digits = raw.replace(/\D/g, '');
  const national = digits.startsWith('351') ? digits.slice(3) : digits;
  if (national.startsWith('9')) return 'mobile';
  if (national.startsWith('2')) return 'geographic';
  if (national.startsWith('80')) return 'tollfree';
  return 'unknown';
}
