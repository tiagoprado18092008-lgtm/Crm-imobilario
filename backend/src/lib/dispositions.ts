/**
 * What each call outcome does to the lead.
 *
 * Extracted from the lead service so the rules can be tested without a
 * database: these decide whether a number is called again, and getting one
 * wrong means either harassing someone who asked to be left alone, or
 * dropping a lead that was interested.
 */

export type DispositionEffect = {
  /** Lead state after the call. */
  state: 'NOVO' | 'A_TRABALHAR' | 'QUALIFICADO' | 'DESQUALIFICADO' | 'NURTURING';
  /** Removes the lead from every queue, sequence and future import. */
  optOutCalls: boolean;
  /** Days until the next attempt, null when there is not one. */
  retryInDays: number | null;
  /** Whether the caller must supply a date (REMARCAR). */
  requiresDate: boolean;
  disqualifiedReason?: string;
};

/** Back-off between unanswered attempts: 1, 2, 4, 7 days, then park. */
const BACKOFF_DAYS = [1, 2, 4, 7];
const MAX_ATTEMPTS = 5;

export function effectOf(disposition: string, attemptNumber: number): DispositionEffect {
  switch (disposition) {
    case 'NAO_CONTACTAR':
      return {
        state: 'DESQUALIFICADO',
        optOutCalls: true,
        retryInDays: null,
        requiresDate: false,
        disqualifiedReason: 'Pediu para não ser contactado',
      };

    case 'NUMERO_ERRADO':
      return {
        state: 'DESQUALIFICADO',
        optOutCalls: false,
        retryInDays: null,
        requiresDate: false,
        disqualifiedReason: 'Número errado',
      };

    case 'ATENDEU_SEM_INTERESSE':
      return { state: 'NURTURING', optOutCalls: false, retryInDays: null, requiresDate: false };

    case 'REMARCAR':
      return { state: 'A_TRABALHAR', optOutCalls: false, retryInDays: null, requiresDate: true };

    case 'REUNIAO_MARCADA':
    case 'ATENDEU_INTERESSADO':
      return { state: 'QUALIFICADO', optOutCalls: false, retryInDays: null, requiresDate: false };

    default: {
      // Not reached, voicemail, gatekeeper, asked for email: try again, with
      // widening gaps, and stop rather than dial the same number forever.
      if (attemptNumber >= MAX_ATTEMPTS) {
        return { state: 'NURTURING', optOutCalls: false, retryInDays: null, requiresDate: false };
      }
      return {
        state: 'A_TRABALHAR',
        optOutCalls: false,
        retryInDays: BACKOFF_DAYS[Math.min(attemptNumber - 1, BACKOFF_DAYS.length - 1)],
        requiresDate: false,
      };
    }
  }
}
