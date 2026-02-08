import { describe, expect, it } from 'vitest';
import { getRestTimerElapsedSeconds, getRestTimerRemainingSeconds } from './restTimer';

describe('restTimer utils', () => {
  it('advances elapsed time using timestamps (background safe)', () => {
    const startedAt = '2026-02-08T10:00:00.000Z';
    const nowMs = new Date('2026-02-08T10:00:30.000Z').getTime();

    expect(
      getRestTimerElapsedSeconds(
        {
          durationSeconds: 90,
          startedAt,
        },
        nowMs
      )
    ).toBe(30);
  });

  it('computes remaining time correctly after long pause in foreground/background', () => {
    const startedAt = '2026-02-08T10:00:00.000Z';
    const nowMs = new Date('2026-02-08T10:00:35.000Z').getTime();

    expect(
      getRestTimerRemainingSeconds(
        {
          durationSeconds: 90,
          startedAt,
        },
        nowMs
      )
    ).toBe(55);
  });

  it('uses paused elapsed seconds while paused', () => {
    expect(
      getRestTimerRemainingSeconds({
        durationSeconds: 90,
        startedAt: '2026-02-08T10:00:00.000Z',
        pausedAt: '2026-02-08T10:00:15.000Z',
        pausedElapsedSeconds: 15,
      })
    ).toBe(75);
  });
});

