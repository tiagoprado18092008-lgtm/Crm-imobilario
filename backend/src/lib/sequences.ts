/**
 * Multichannel sequences.
 *
 * A sequence is a cadence of touches — call, email, WhatsApp, task — spaced
 * over working days. The rule that matters most is the one the existing
 * automation engine does not have: **a sequence stops the moment the person
 * responds.** Continuing to send after a reply is how a follow-up becomes
 * harassment, and it is the single behaviour most likely to lose the deal it
 * was meant to win.
 *
 * These rules are pure so they can be tested without a database or a clock.
 */

export type SequenceChannel = 'CHAMADA' | 'EMAIL' | 'WHATSAPP' | 'TAREFA';

export type SequenceStep = {
  /** Working days after the previous step. 0 means same day. */
  delayDays: number;
  channel: SequenceChannel;
  templateId?: string;
  subject?: string;
  body?: string;
  /** Shown on the task or call queue entry. */
  label?: string;
};

export type EnrollmentState = {
  currentStep: number;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'STOPPED';
  stoppedReason?: string;
};

/**
 * Anything that ends a sequence early.
 *
 * Replies stop it because the point of the cadence was to start a
 * conversation, and it has started. Opt-out stops it because continuing would
 * be ignoring an explicit request.
 */
export type StopEvent =
  | 'REPLY_EMAIL'
  | 'REPLY_WHATSAPP'
  | 'REPLY_SMS'
  | 'CALL_ANSWERED'
  | 'MEETING_BOOKED'
  | 'OPT_OUT'
  | 'DISQUALIFIED'
  | 'CONVERTED';

const STOP_REASONS: Record<StopEvent, string> = {
  REPLY_EMAIL: 'Respondeu por email',
  REPLY_WHATSAPP: 'Respondeu por WhatsApp',
  REPLY_SMS: 'Respondeu por SMS',
  CALL_ANSWERED: 'Atendeu a chamada',
  MEETING_BOOKED: 'Reunião marcada',
  OPT_OUT: 'Pediu para não ser contactado',
  DISQUALIFIED: 'Lead desqualificada',
  CONVERTED: 'Convertida em negócio',
};

/** Whether an event ends the sequence, and why. */
export function stopReasonFor(event: StopEvent): string {
  return STOP_REASONS[event] ?? 'Parada';
}

/**
 * Advances an enrollment one step.
 *
 * Returns the next state and the step to run, or null when the sequence is
 * finished.
 */
export function advance(
  state: EnrollmentState,
  steps: SequenceStep[],
): { state: EnrollmentState; step: SequenceStep | null } {
  if (state.status !== 'ACTIVE') {
    return { state, step: null };
  }

  const next = state.currentStep;
  if (next >= steps.length) {
    return { state: { ...state, status: 'COMPLETED' }, step: null };
  }

  return {
    state: { ...state, currentStep: next + 1 },
    step: steps[next],
  };
}

/** Ends an enrollment, recording why. */
export function stop(state: EnrollmentState, event: StopEvent): EnrollmentState {
  return { ...state, status: 'STOPPED', stoppedReason: stopReasonFor(event) };
}

/**
 * When a step is due, counting working days only.
 *
 * A three-day follow-up scheduled on a Friday should land on Wednesday, not
 * over the weekend when nobody reads it and the message is buried by Monday.
 */
export function dueDateFor(from: Date, delayDays: number): Date {
  const due = new Date(from);

  if (delayDays <= 0) {
    return skipToWorkingDay(due);
  }

  let remaining = delayDays;
  while (remaining > 0) {
    due.setDate(due.getDate() + 1);
    if (isWorkingDay(due)) remaining--;
  }
  return due;
}

function isWorkingDay(d: Date): boolean {
  const day = d.getDay();
  return day !== 0 && day !== 6;
}

function skipToWorkingDay(d: Date): Date {
  const out = new Date(d);
  while (!isWorkingDay(out)) {
    out.setDate(out.getDate() + 1);
  }
  return out;
}

/**
 * Whether a channel may be used, given the recipient's opt-outs.
 *
 * Checked per step rather than once on enrollment: someone can opt out of
 * calls halfway through a cadence and the remaining emails are still fine.
 */
export function channelAllowed(
  channel: SequenceChannel,
  optOuts: { calls?: boolean; email?: boolean; whatsapp?: boolean },
): boolean {
  switch (channel) {
    case 'CHAMADA':
      return !optOuts.calls;
    case 'EMAIL':
      return !optOuts.email;
    case 'WHATSAPP':
      return !optOuts.whatsapp;
    case 'TAREFA':
      // An internal task is not a contact attempt.
      return true;
  }
}

/**
 * Fills {{contacto.nome}} style placeholders.
 *
 * An unresolved placeholder renders empty rather than showing its own name to
 * the recipient: "Olá {{contacto.nome}}" reaching a clinic is worse than
 * "Olá".
 */
export function renderTemplate(
  template: string,
  vars: Record<string, unknown>,
): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path: string) => {
    const value = path
      .split('.')
      .reduce<any>((node, key) => (node == null ? undefined : node[key]), vars);
    return value == null ? '' : String(value);
  });
}

/** Default cadence for a cold clinic lead: five touches over two weeks. */
export const DEFAULT_COLD_SEQUENCE: SequenceStep[] = [
  { delayDays: 0, channel: 'CHAMADA', label: 'Primeira chamada' },
  { delayDays: 2, channel: 'EMAIL', subject: 'Seguimento — {{empresa.nome}}', label: 'Email de seguimento' },
  { delayDays: 3, channel: 'CHAMADA', label: 'Segunda chamada' },
  { delayDays: 4, channel: 'WHATSAPP', label: 'Mensagem WhatsApp' },
  { delayDays: 5, channel: 'CHAMADA', label: 'Última tentativa' },
];
