import { ZadarmaProvider } from '../lib/telephony/zadarma/zadarma.provider';

/**
 * Webhook normalisation.
 *
 * Every call in the CRM is built from these payloads, so each event shape is
 * pinned. Fixtures follow the field names in the official PHP client.
 */

const provider = new ZadarmaProvider('key', 'secret', 'webhook-token-long-and-random');

describe('normalizeEvent', () => {
  it('ignores anything that is not an event', () => {
    expect(provider.normalizeEvent(null)).toBeNull();
    expect(provider.normalizeEvent({})).toBeNull();
    expect(provider.normalizeEvent({ foo: 'bar' })).toBeNull();
  });

  it('ignores event types we do not act on, rather than guessing', () => {
    expect(provider.normalizeEvent({ event: 'NOTIFY_IVR', pbx_call_id: '1' })).toBeNull();
    expect(provider.normalizeEvent({ event: 'SOMETHING_NEW', pbx_call_id: '1' })).toBeNull();
  });

  it('reads an inbound call starting', () => {
    const e = provider.normalizeEvent({
      event: 'NOTIFY_START',
      pbx_call_id: 'abc123',
      caller_id: '912345678',
      called_did: '289123456',
    });
    expect(e).toMatchObject({
      type: 'call.started',
      direction: 'inbound',
      state: 'a_tocar',
      providerCallId: 'abc123',
    });
    // Numbers arrive national and are stored E.164.
    expect(e?.from).toBe('+351912345678');
    expect(e?.to).toBe('+351289123456');
  });

  it('reads an outbound call starting', () => {
    const e = provider.normalizeEvent({
      event: 'NOTIFY_OUT_START',
      pbx_call_id: 'out1',
      caller_id: '289123456',
      destination: '912345678',
      internal: '101',
    });
    expect(e).toMatchObject({
      type: 'call.started',
      direction: 'outbound',
      extension: '101',
    });
    expect(e?.to).toBe('+351912345678');
  });

  it('reads a call being answered', () => {
    const e = provider.normalizeEvent({ event: 'NOTIFY_ANSWER', pbx_call_id: 'a1' });
    expect(e).toMatchObject({ type: 'call.answered', state: 'atendida' });
  });

  it('reads an answered call ending, with talk time and cost', () => {
    const e = provider.normalizeEvent({
      event: 'NOTIFY_OUT_END',
      pbx_call_id: 'end1',
      duration: 95,
      billseconds: 72,
      disposition: 'answered',
      cost: 0.063,
      currency: 'USD',
    });
    expect(e).toMatchObject({
      type: 'call.ended',
      direction: 'outbound',
      state: 'terminada',
      duration: 95,
      talkTime: 72,
      cost: 0.063,
    });
  });

  it('marks an unanswered call as failed', () => {
    const e = provider.normalizeEvent({
      event: 'NOTIFY_OUT_END',
      pbx_call_id: 'end2',
      duration: 30,
      billseconds: 0,
      disposition: 'no answer',
    });
    expect(e?.state).toBe('falhada');
  });

  it('treats any talk time as an answered call, whatever the disposition says', () => {
    const e = provider.normalizeEvent({
      event: 'NOTIFY_END',
      pbx_call_id: 'end3',
      billseconds: 12,
      disposition: 'unknown',
    });
    expect(e?.state).toBe('terminada');
  });

  it('reads a recording becoming available', () => {
    const e = provider.normalizeEvent({
      event: 'NOTIFY_RECORD',
      pbx_call_id: 'rec1',
      call_id_with_rec: 'rec-id-xyz',
    });
    expect(e).toMatchObject({ type: 'recording.ready', recordingId: 'rec-id-xyz' });
  });

  it('keeps the raw payload for reconciliation', () => {
    const payload = { event: 'NOTIFY_ANSWER', pbx_call_id: 'x', extra: 'kept' };
    expect(provider.normalizeEvent(payload)?.raw).toEqual(payload);
  });
});

describe('verifyWebhook', () => {
  const req = (over: Partial<Parameters<typeof provider.verifyWebhook>[0]> = {}) => ({
    headers: {},
    body: {},
    query: {},
    ...over,
  });

  it('accepts the configured token from the query', async () => {
    expect(await provider.verifyWebhook(req({ query: { token: 'webhook-token-long-and-random' } }))).toBe(true);
  });

  it('accepts the token from the end of the path', async () => {
    expect(
      await provider.verifyWebhook(req({ path: '/api/webhooks/zadarma/webhook-token-long-and-random' })),
    ).toBe(true);
  });

  it('rejects a wrong or missing token', async () => {
    expect(await provider.verifyWebhook(req({ query: { token: 'wrong' } }))).toBe(false);
    expect(await provider.verifyWebhook(req())).toBe(false);
  });

  it('rejects everything when no token is configured', async () => {
    // Zadarma does not sign its webhooks, so an unconfigured endpoint must
    // refuse rather than accept whatever arrives.
    const unconfigured = new ZadarmaProvider('key', 'secret');
    expect(await unconfigured.verifyWebhook(req({ query: { token: 'anything' } }))).toBe(false);
  });
});

describe('constructor', () => {
  it('refuses to start without credentials', () => {
    expect(() => new ZadarmaProvider('', 'secret')).toThrow(/Credenciais/);
    expect(() => new ZadarmaProvider('key', '')).toThrow(/Credenciais/);
  });
});
