/**
 * Goal progress.
 *
 * The metric that matters most to AlphaScale is meetings booked per week:
 * everything downstream follows from it, and it is the one a BDR can move
 * today. Revenue is a lagging measure of calls made three weeks ago.
 *
 * Progress is reported against elapsed time, not just against the target. A
 * rep at 50% on the last day of the month is behind; at 50% on the tenth they
 * are ahead, and showing both the same way is how a dashboard stops being
 * read.
 */

export type GoalPeriod = 'SEMANAL' | 'MENSAL' | 'TRIMESTRAL';

export type GoalProgress = {
  target: number;
  actual: number;
  /** 0-1, uncapped: exceeding a target is worth seeing. */
  ratio: number;
  /** How far through the period we are, 0-1. */
  elapsed: number;
  /** What the actual should be by now to finish on target. */
  expected: number;
  /** Ahead, on track, behind — judged against elapsed time. */
  status: 'ADIANTADO' | 'A_CAMINHO' | 'ATRASADO';
  /** Per remaining working day, to hit the target. Null once reached. */
  dailyNeeded: number | null;
};

/** Start and end of the period a date falls in. */
export function periodBounds(period: GoalPeriod, on = new Date()): { start: Date; end: Date } {
  const start = new Date(on);
  start.setHours(0, 0, 0, 0);

  if (period === 'SEMANAL') {
    // Weeks run Monday to Sunday: a sales week is not a calendar week
    // starting on Sunday.
    const day = start.getDay();
    const offset = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - offset);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end };
  }

  if (period === 'TRIMESTRAL') {
    const quarter = Math.floor(start.getMonth() / 3);
    const qStart = new Date(start.getFullYear(), quarter * 3, 1);
    const qEnd = new Date(start.getFullYear(), quarter * 3 + 3, 1);
    return { start: qStart, end: qEnd };
  }

  const mStart = new Date(start.getFullYear(), start.getMonth(), 1);
  const mEnd = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  return { start: mStart, end: mEnd };
}

/**
 * Working days between two dates, excluding the end.
 *
 * Both ends are reduced to a plain calendar day first. Comparing timestamps
 * would make the result depend on the time of day — and a date parsed from
 * "2026-09-21" is midnight UTC, which is the previous evening in Lisbon.
 */
export function workingDaysBetween(from: Date, to: Date): number {
  const cursor = startOfDay(from);
  const limit = startOfDay(to);

  let count = 0;
  while (cursor < limit) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

/** Midnight local time on the same calendar day. */
function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

/**
 * Progress against a goal.
 *
 * Elapsed time is counted in working days, not calendar days: a month is not
 * two-thirds gone on the twentieth if six of those days were weekends.
 */
export function goalProgress(
  target: number,
  actual: number,
  period: GoalPeriod,
  now = new Date(),
): GoalProgress {
  const { start, end } = periodBounds(period, now);

  const totalDays = workingDaysBetween(start, end);
  const daysGone = workingDaysBetween(start, now);
  const daysLeft = Math.max(0, totalDays - daysGone);

  const elapsed = totalDays > 0 ? Math.min(1, daysGone / totalDays) : 0;
  const ratio = target > 0 ? actual / target : 0;
  const expected = Math.round(target * elapsed * 100) / 100;

  // A 10% band either side of the pace, so normal variation does not read as
  // a problem every other day.
  let status: GoalProgress['status'];
  if (ratio >= 1) status = 'ADIANTADO';
  else if (expected === 0) status = 'A_CAMINHO';
  else if (actual >= expected * 0.9) status = actual > expected * 1.1 ? 'ADIANTADO' : 'A_CAMINHO';
  else status = 'ATRASADO';

  const remaining = Math.max(0, target - actual);
  const dailyNeeded =
    remaining === 0 ? null : daysLeft > 0 ? Math.ceil((remaining / daysLeft) * 10) / 10 : remaining;

  return {
    target,
    actual,
    ratio: Math.round(ratio * 1000) / 1000,
    elapsed: Math.round(elapsed * 1000) / 1000,
    expected,
    status,
    dailyNeeded,
  };
}

export type LeaderboardEntry = {
  userId: string;
  name: string;
  calls: number;
  meetings: number;
  dealsCreated: number;
  dealsWon: number;
  valueWon: number;
};

/**
 * Ranks the team.
 *
 * Sorted on meetings booked, then value won. Ranking on calls alone rewards
 * dialling rather than selling, and a leaderboard changes behaviour in
 * whatever direction it points.
 */
export function rankLeaderboard(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort((a, b) => {
    if (b.meetings !== a.meetings) return b.meetings - a.meetings;
    if (b.valueWon !== a.valueWon) return b.valueWon - a.valueWon;
    return b.calls - a.calls;
  });
}
