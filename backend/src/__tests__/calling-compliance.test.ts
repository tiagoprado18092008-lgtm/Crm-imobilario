import { assertWithinCallingHours } from '../modules/telephony/calls.service';
import { effectOf } from '../lib/dispositions';

/**
 * Cold-calling compliance.
 *
 * Section 9.5 requires these to be implemented and tested, not merely
 * documented. The calling window is enforced on the server so a stale browser
 * tab cannot place a call at nine in the evening.
 */

const at = (iso: string) => new Date(iso);

describe('assertWithinCallingHours', () => {
  // 2026-09-21 is a Monday; 2026-09-26 and 27 are Saturday and Sunday.
  it('allows a weekday inside the window', () => {
    expect(() => assertWithinCallingHours(at('2026-09-21T10:00:00'))).not.toThrow();
    expect(() => assertWithinCallingHours(at('2026-09-21T09:00:00'))).not.toThrow();
    expect(() => assertWithinCallingHours(at('2026-09-21T19:59:00'))).not.toThrow();
  });

  it('refuses before the window opens', () => {
    expect(() => assertWithinCallingHours(at('2026-09-21T08:59:00'))).toThrow(/horário/);
    expect(() => assertWithinCallingHours(at('2026-09-21T06:00:00'))).toThrow(/horário/);
  });

  it('refuses once the window closes', () => {
    // 20:00 is the first minute outside, not the last minute inside.
    expect(() => assertWithinCallingHours(at('2026-09-21T20:00:00'))).toThrow(/horário/);
    expect(() => assertWithinCallingHours(at('2026-09-21T22:30:00'))).toThrow(/horário/);
  });

  it('refuses at the weekend, whatever the hour', () => {
    expect(() => assertWithinCallingHours(at('2026-09-26T11:00:00'))).toThrow(/fim de semana/);
    expect(() => assertWithinCallingHours(at('2026-09-27T15:00:00'))).toThrow(/fim de semana/);
  });

  it('refuses with a 403, so the dialer can tell this apart from a failure', () => {
    try {
      assertWithinCallingHours(at('2026-09-21T23:00:00'));
      throw new Error('should have refused');
    } catch (err: any) {
      expect(err.status).toBe(403);
    }
  });
});

/**
 * Disposition consequences.
 *
 * NAO_CONTACTAR is the one that must be irreversible from the dialer: someone
 * who asked not to be called again must leave every queue, sequence and future
 * import. Section 9.5 requires this to be covered by a test.
 */
describe('effectOf', () => {
  it('opts a lead out permanently on NAO_CONTACTAR', () => {
    const e = effectOf('NAO_CONTACTAR', 1);
    expect(e.optOutCalls).toBe(true);
    expect(e.state).toBe('DESQUALIFICADO');
    expect(e.retryInDays).toBeNull();
    expect(e.disqualifiedReason).toMatch(/não ser contactado/);
  });

  it('opts out on the first attempt as readily as the fifth', () => {
    // The request stands whenever it is made.
    for (const attempt of [1, 2, 5, 20]) {
      expect(effectOf('NAO_CONTACTAR', attempt).optOutCalls).toBe(true);
    }
  });

  it('never opts out for any other disposition', () => {
    for (const d of [
      'ATENDEU_INTERESSADO', 'ATENDEU_SEM_INTERESSE', 'GATEKEEPER',
      'PEDIU_INFO_EMAIL', 'REMARCAR', 'NAO_ATENDEU', 'VOICEMAIL',
      'NUMERO_ERRADO', 'REUNIAO_MARCADA',
    ]) {
      expect(effectOf(d, 1).optOutCalls).toBe(false);
    }
  });

  it('disqualifies a wrong number without opting the person out', () => {
    // The number is wrong; the person never asked for anything.
    const e = effectOf('NUMERO_ERRADO', 1);
    expect(e.state).toBe('DESQUALIFICADO');
    expect(e.optOutCalls).toBe(false);
  });

  it('qualifies an interested lead and one with a meeting booked', () => {
    expect(effectOf('ATENDEU_INTERESSADO', 1).state).toBe('QUALIFICADO');
    expect(effectOf('REUNIAO_MARCADA', 1).state).toBe('QUALIFICADO');
  });

  it('parks a lead that answered without interest', () => {
    expect(effectOf('ATENDEU_SEM_INTERESSE', 1).state).toBe('NURTURING');
  });

  it('requires a date for REMARCAR', () => {
    const e = effectOf('REMARCAR', 1);
    expect(e.requiresDate).toBe(true);
    expect(e.retryInDays).toBeNull();
  });

  it('widens the gap between unanswered attempts', () => {
    expect(effectOf('NAO_ATENDEU', 1).retryInDays).toBe(1);
    expect(effectOf('NAO_ATENDEU', 2).retryInDays).toBe(2);
    expect(effectOf('NAO_ATENDEU', 3).retryInDays).toBe(4);
    expect(effectOf('NAO_ATENDEU', 4).retryInDays).toBe(7);
  });

  it('stops calling after five attempts instead of dialling forever', () => {
    const e = effectOf('NAO_ATENDEU', 5);
    expect(e.state).toBe('NURTURING');
    expect(e.retryInDays).toBeNull();
  });

  it('treats voicemail and gatekeeper like an unanswered call', () => {
    for (const d of ['VOICEMAIL', 'GATEKEEPER', 'PEDIU_INFO_EMAIL']) {
      expect(effectOf(d, 1).retryInDays).toBe(1);
      expect(effectOf(d, 1).state).toBe('A_TRABALHAR');
    }
  });
});
