import {
  advance,
  stop,
  stopReasonFor,
  dueDateFor,
  channelAllowed,
  renderTemplate,
  DEFAULT_COLD_SEQUENCE,
  type EnrollmentState,
  type SequenceStep,
} from '../lib/sequences';

const active = (currentStep = 0): EnrollmentState => ({ currentStep, status: 'ACTIVE' });

const STEPS: SequenceStep[] = [
  { delayDays: 0, channel: 'CHAMADA' },
  { delayDays: 2, channel: 'EMAIL' },
  { delayDays: 3, channel: 'WHATSAPP' },
];

describe('advance', () => {
  it('walks the steps in order', () => {
    let state = active();
    const run: string[] = [];
    for (let i = 0; i < 3; i++) {
      const result = advance(state, STEPS);
      state = result.state;
      if (result.step) run.push(result.step.channel);
    }
    expect(run).toEqual(['CHAMADA', 'EMAIL', 'WHATSAPP']);
  });

  it('completes after the last step', () => {
    const { state, step } = advance(active(3), STEPS);
    expect(step).toBeNull();
    expect(state.status).toBe('COMPLETED');
  });

  it('runs nothing once stopped', () => {
    const stopped: EnrollmentState = { currentStep: 1, status: 'STOPPED' };
    expect(advance(stopped, STEPS).step).toBeNull();
  });

  it('runs nothing while paused', () => {
    const paused: EnrollmentState = { currentStep: 1, status: 'PAUSED' };
    expect(advance(paused, STEPS).step).toBeNull();
  });
});

describe('stop', () => {
  it('stops on a reply, which is the point of the cadence', () => {
    // The sequence existed to start a conversation. It has started.
    const state = stop(active(1), 'REPLY_EMAIL');
    expect(state.status).toBe('STOPPED');
    expect(state.stoppedReason).toBe('Respondeu por email');
  });

  it('stops on a reply on any channel', () => {
    for (const e of ['REPLY_EMAIL', 'REPLY_WHATSAPP', 'REPLY_SMS'] as const) {
      expect(stop(active(1), e).status).toBe('STOPPED');
    }
  });

  it('stops when the call is answered', () => {
    expect(stop(active(1), 'CALL_ANSWERED').stoppedReason).toBe('Atendeu a chamada');
  });

  it('stops on opt-out', () => {
    expect(stop(active(1), 'OPT_OUT').stoppedReason).toMatch(/não ser contactado/);
  });

  it('stops when a meeting is booked or the lead converts', () => {
    expect(stop(active(2), 'MEETING_BOOKED').status).toBe('STOPPED');
    expect(stop(active(2), 'CONVERTED').status).toBe('STOPPED');
  });

  it('a stopped enrollment stays stopped when advanced', () => {
    const stopped = stop(active(1), 'REPLY_WHATSAPP');
    const { step } = advance(stopped, STEPS);
    expect(step).toBeNull();
  });

  it('names every stop reason in Portuguese', () => {
    for (const e of [
      'REPLY_EMAIL', 'REPLY_WHATSAPP', 'REPLY_SMS', 'CALL_ANSWERED',
      'MEETING_BOOKED', 'OPT_OUT', 'DISQUALIFIED', 'CONVERTED',
    ] as const) {
      expect(stopReasonFor(e)).toMatch(/[a-zç]/i);
    }
  });
});

describe('dueDateFor', () => {
  // 2026-09-21 is a Monday.
  const monday = new Date('2026-09-21T10:00:00');
  const friday = new Date('2026-09-25T10:00:00');

  it('counts working days, not calendar days', () => {
    // Monday + 3 working days is Thursday.
    expect(dueDateFor(monday, 3).getDay()).toBe(4);
  });

  it('skips the weekend', () => {
    // Friday + 1 working day is Monday, not Saturday: a message that lands on
    // a Saturday is buried by Monday morning.
    const due = dueDateFor(friday, 1);
    expect(due.getDay()).toBe(1);
    expect(due.getDate()).toBe(28);
  });

  it('skips a whole weekend for a longer gap', () => {
    // Friday + 3 working days is Wednesday.
    expect(dueDateFor(friday, 3).getDay()).toBe(3);
  });

  it('treats zero delay as today, when today is a working day', () => {
    expect(dueDateFor(monday, 0).getDate()).toBe(21);
  });

  it('moves a zero-delay step off a weekend', () => {
    const saturday = new Date('2026-09-26T10:00:00');
    expect(dueDateFor(saturday, 0).getDay()).toBe(1);
  });
});

describe('channelAllowed', () => {
  it('blocks the channel the person opted out of, and only that one', () => {
    const optOuts = { calls: true };
    expect(channelAllowed('CHAMADA', optOuts)).toBe(false);
    expect(channelAllowed('EMAIL', optOuts)).toBe(true);
    expect(channelAllowed('WHATSAPP', optOuts)).toBe(true);
  });

  it('blocks email and WhatsApp independently', () => {
    expect(channelAllowed('EMAIL', { email: true })).toBe(false);
    expect(channelAllowed('WHATSAPP', { whatsapp: true })).toBe(false);
  });

  it('always allows an internal task, which is not a contact attempt', () => {
    expect(channelAllowed('TAREFA', { calls: true, email: true, whatsapp: true })).toBe(true);
  });

  it('allows everything when nothing is opted out', () => {
    for (const c of ['CHAMADA', 'EMAIL', 'WHATSAPP', 'TAREFA'] as const) {
      expect(channelAllowed(c, {})).toBe(true);
    }
  });
});

describe('renderTemplate', () => {
  const vars = { contacto: { nome: 'Ana' }, empresa: { nome: 'Clínica Sorriso' } };

  it('fills placeholders', () => {
    expect(renderTemplate('Olá {{contacto.nome}}', vars)).toBe('Olá Ana');
    expect(renderTemplate('{{empresa.nome}} — proposta', vars)).toBe('Clínica Sorriso — proposta');
  });

  it('tolerates spaces inside the braces', () => {
    expect(renderTemplate('Olá {{ contacto.nome }}', vars)).toBe('Olá Ana');
  });

  it('renders an unknown placeholder as empty, not as its own name', () => {
    // "Olá {{contacto.nome}}" arriving at a clinic is worse than "Olá".
    expect(renderTemplate('Olá {{contacto.apelido}}', vars)).toBe('Olá ');
    expect(renderTemplate('{{nada}}', vars)).toBe('');
  });

  it('leaves text without placeholders untouched', () => {
    expect(renderTemplate('Bom dia', vars)).toBe('Bom dia');
  });
});

describe('DEFAULT_COLD_SEQUENCE', () => {
  it('is five touches across more than one channel', () => {
    expect(DEFAULT_COLD_SEQUENCE).toHaveLength(5);
    expect(new Set(DEFAULT_COLD_SEQUENCE.map((s) => s.channel)).size).toBeGreaterThan(1);
  });

  it('starts with a call on the day of enrollment', () => {
    expect(DEFAULT_COLD_SEQUENCE[0]).toMatchObject({ delayDays: 0, channel: 'CHAMADA' });
  });

  it('spreads over about two working weeks', () => {
    const total = DEFAULT_COLD_SEQUENCE.reduce((s, step) => s + step.delayDays, 0);
    expect(total).toBeGreaterThanOrEqual(10);
    expect(total).toBeLessThanOrEqual(20);
  });
});
