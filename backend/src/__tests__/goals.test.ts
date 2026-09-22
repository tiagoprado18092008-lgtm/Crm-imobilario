import {
  periodBounds,
  workingDaysBetween,
  goalProgress,
  rankLeaderboard,
  type LeaderboardEntry,
} from '../lib/goals';

describe('periodBounds', () => {
  it('runs the week from Monday to Sunday', () => {
    // A sales week starts on Monday, not on the calendar's Sunday.
    const wednesday = new Date('2026-09-23T14:00:00');
    const { start, end } = periodBounds('SEMANAL', wednesday);
    expect(start.getDay()).toBe(1);
    expect(start.getDate()).toBe(21);
    expect(end.getDate()).toBe(28);
  });

  it('starts the week on the Monday when today is Monday', () => {
    const monday = new Date('2026-09-21T09:00:00');
    expect(periodBounds('SEMANAL', monday).start.getDate()).toBe(21);
  });

  it('keeps Sunday in the week that started the Monday before', () => {
    const sunday = new Date('2026-09-27T20:00:00');
    expect(periodBounds('SEMANAL', sunday).start.getDate()).toBe(21);
  });

  it('bounds the calendar month', () => {
    const { start, end } = periodBounds('MENSAL', new Date('2026-09-15T12:00:00'));
    expect(start.getDate()).toBe(1);
    expect(start.getMonth()).toBe(8);
    expect(end.getMonth()).toBe(9);
  });

  it('bounds the quarter', () => {
    const { start, end } = periodBounds('TRIMESTRAL', new Date('2026-09-15T12:00:00'));
    // September is in Q3: July to September.
    expect(start.getMonth()).toBe(6);
    expect(end.getMonth()).toBe(9);
  });
});

describe('workingDaysBetween', () => {
  it('excludes weekends', () => {
    // Monday 21st to Monday 28th is five working days.
    expect(workingDaysBetween(new Date('2026-09-21'), new Date('2026-09-28'))).toBe(5);
  });

  it('is zero for the same day', () => {
    expect(workingDaysBetween(new Date('2026-09-21'), new Date('2026-09-21'))).toBe(0);
  });

  it('counts a weekend as nothing', () => {
    expect(workingDaysBetween(new Date('2026-09-26'), new Date('2026-09-28'))).toBe(0);
  });
});

describe('goalProgress', () => {
  // Monday 21 September 2026. The month has 22 working days.
  const early = new Date('2026-09-02T10:00:00');
  const mid = new Date('2026-09-16T10:00:00');
  const late = new Date('2026-09-30T10:00:00');

  it('is ahead once the target is reached, whenever that happens', () => {
    expect(goalProgress(20, 20, 'MENSAL', early).status).toBe('ADIANTADO');
    expect(goalProgress(20, 25, 'MENSAL', late).ratio).toBe(1.25);
  });

  it('does not cap the ratio, so exceeding a target is visible', () => {
    expect(goalProgress(10, 30, 'MENSAL', mid).ratio).toBe(3);
  });

  it('judges against elapsed time, not against the target alone', () => {
    // Half the target on day two is ahead; half on the last day is behind.
    expect(goalProgress(20, 10, 'MENSAL', early).status).toBe('ADIANTADO');
    expect(goalProgress(20, 10, 'MENSAL', late).status).toBe('ATRASADO');
  });

  it('reports what the figure should be by now', () => {
    const p = goalProgress(22, 0, 'MENSAL', mid);
    expect(p.expected).toBeGreaterThan(0);
    expect(p.expected).toBeLessThan(22);
  });

  it('allows a 10% band before calling someone behind', () => {
    // Normal variation should not read as a problem every other day.
    const p = goalProgress(100, 0, 'MENSAL', mid);
    const justUnder = goalProgress(100, p.expected * 0.95, 'MENSAL', mid);
    expect(justUnder.status).toBe('A_CAMINHO');
  });

  it('says how much per remaining day is needed', () => {
    const p = goalProgress(20, 5, 'MENSAL', mid);
    expect(p.dailyNeeded).toBeGreaterThan(0);
  });

  it('needs nothing more once the target is met', () => {
    expect(goalProgress(20, 20, 'MENSAL', mid).dailyNeeded).toBeNull();
    expect(goalProgress(20, 25, 'MENSAL', mid).dailyNeeded).toBeNull();
  });

  it('asks for the whole remainder when no days are left', () => {
    const p = goalProgress(20, 5, 'MENSAL', new Date('2026-09-30T23:00:00'));
    expect(p.dailyNeeded).toBe(15);
  });

  it('copes with a zero target rather than dividing by it', () => {
    const p = goalProgress(0, 5, 'MENSAL', mid);
    expect(p.ratio).toBe(0);
    expect(p.status).toBe('A_CAMINHO');
  });

  it('reports elapsed between nothing and everything', () => {
    expect(goalProgress(10, 0, 'MENSAL', early).elapsed).toBeLessThan(0.3);
    expect(goalProgress(10, 0, 'MENSAL', late).elapsed).toBeGreaterThan(0.8);
  });
});

describe('rankLeaderboard', () => {
  const entry = (over: Partial<LeaderboardEntry>): LeaderboardEntry => ({
    userId: 'u', name: 'X', calls: 0, meetings: 0, dealsCreated: 0, dealsWon: 0, valueWon: 0,
    ...over,
  });

  it('ranks on meetings before anything else', () => {
    // Ranking on calls rewards dialling rather than selling, and a
    // leaderboard changes behaviour in whatever direction it points.
    const ranked = rankLeaderboard([
      entry({ userId: 'a', calls: 500, meetings: 1 }),
      entry({ userId: 'b', calls: 100, meetings: 8 }),
    ]);
    expect(ranked[0].userId).toBe('b');
  });

  it('breaks a tie on meetings with value won', () => {
    const ranked = rankLeaderboard([
      entry({ userId: 'a', meetings: 5, valueWon: 700 }),
      entry({ userId: 'b', meetings: 5, valueWon: 2100 }),
    ]);
    expect(ranked[0].userId).toBe('b');
  });

  it('falls back to calls when meetings and value tie', () => {
    const ranked = rankLeaderboard([
      entry({ userId: 'a', meetings: 5, valueWon: 700, calls: 90 }),
      entry({ userId: 'b', meetings: 5, valueWon: 700, calls: 150 }),
    ]);
    expect(ranked[0].userId).toBe('b');
  });

  it('does not mutate the array it is given', () => {
    const input = [entry({ userId: 'a', meetings: 1 }), entry({ userId: 'b', meetings: 9 })];
    rankLeaderboard(input);
    expect(input[0].userId).toBe('a');
  });

  it('handles an empty team', () => {
    expect(rankLeaderboard([])).toEqual([]);
  });
});
