export type RestTimerStateLike = {
  durationSeconds: number;
  startedAt: string;
  pausedAt?: string;
  pausedElapsedSeconds?: number;
};

const clampNonNegative = (value: number) => (value > 0 ? value : 0);

export const getRestTimerElapsedSeconds = (
  timer: RestTimerStateLike,
  nowMs: number = Date.now()
) => {
  if (timer.pausedAt) {
    return clampNonNegative(timer.pausedElapsedSeconds ?? 0);
  }

  const startedAtMs = new Date(timer.startedAt).getTime();
  if (!Number.isFinite(startedAtMs)) return 0;

  return clampNonNegative(Math.floor((nowMs - startedAtMs) / 1000));
};

export const getRestTimerRemainingSeconds = (
  timer: RestTimerStateLike,
  nowMs: number = Date.now()
) => {
  const elapsed = getRestTimerElapsedSeconds(timer, nowMs);
  return clampNonNegative(timer.durationSeconds - elapsed);
};

