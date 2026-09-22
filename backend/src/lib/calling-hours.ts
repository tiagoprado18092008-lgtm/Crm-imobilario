/**
 * The window in which the dialer may place a call.
 *
 * Kept apart from the telephony service so it can be tested without pulling in
 * a provider, a database or the WhatsApp socket. It is a rule about the clock,
 * not about a carrier.
 *
 * Enforced on the server rather than in the dialer: a browser tab left open
 * overnight must not be able to place a call at nine in the evening.
 */

/** Refuses when `now` falls outside the workspace's calling window. */
export function assertWithinCallingHours(now = new Date()): void {
  const startHour = Number(process.env.CALLING_HOURS_START ?? 9);
  const endHour = Number(process.env.CALLING_HOURS_END ?? 20);

  const day = now.getDay();
  if (day === 0 || day === 6) {
    throw Object.assign(
      new Error('Fora do horário permitido para chamadas (fim de semana)'),
      { status: 403 },
    );
  }

  const hour = now.getHours();
  if (hour < startHour || hour >= endHour) {
    throw Object.assign(
      new Error(`Fora do horário permitido para chamadas (${startHour}h–${endHour}h)`),
      { status: 403 },
    );
  }
}

/** Whether a call may be placed now, without throwing. */
export function isWithinCallingHours(now = new Date()): boolean {
  try {
    assertWithinCallingHours(now);
    return true;
  } catch {
    return false;
  }
}
