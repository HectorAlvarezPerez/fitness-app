import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RestTimerStateLike, getRestTimerRemainingSeconds } from '../lib/restTimer';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface RestTimerProps {
  timer: RestTimerStateLike & { instanceId: string };
  onComplete?: () => void;
  onCancel?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onAddSeconds?: (seconds: number) => void;
  variant?: 'modal' | 'footer' | 'inline';
}

const playDoneTone = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.08, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.2);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.2);
  } catch {
    // Ignore audio failures.
  }
};

const notifiedRestTimerInstances = new Set<string>();

const notifyRestDone = () => {
  const notifPref = localStorage.getItem('fitness-rest-timer-notifications');
  if (notifPref === 'off') return;

  if (!('Notification' in window)) return;

  const show = () => {
    try {
      new Notification('⏱ Descanso terminado', {
        body: 'Hora de la siguiente serie',
        icon: '/favicon.ico',
      });
    } catch {
      // ignore
    }
  };

  if (Notification.permission === 'granted') {
    show();
    return;
  }

  if (Notification.permission === 'default' && document.visibilityState === 'visible') {
    Notification.requestPermission()
      .then((permission) => {
        if (permission === 'granted') show();
      })
      .catch(() => {
        // ignore
      });
  }
};

export const RestTimer: React.FC<RestTimerProps> = ({
  timer,
  onComplete,
  onCancel,
  onPause,
  onResume,
  onAddSeconds,
  variant = 'modal',
}) => {
  const [nowMs, setNowMs] = useState(Date.now());
  const completedTimerRef = useRef<string | null>(null);

  const remaining = useMemo(() => getRestTimerRemainingSeconds(timer, nowMs), [timer, nowMs]);
  const isPaused = Boolean(timer.pausedAt);

  const completeTimer = useCallback(() => {
    if (completedTimerRef.current === timer.instanceId) return;
    if (notifiedRestTimerInstances.has(timer.instanceId)) return;

    completedTimerRef.current = timer.instanceId;
    notifiedRestTimerInstances.add(timer.instanceId);

    // Avoid unbounded growth in very long sessions.
    if (notifiedRestTimerInstances.size > 200) {
      notifiedRestTimerInstances.clear();
      notifiedRestTimerInstances.add(timer.instanceId);
    }

    playDoneTone();
    notifyRestDone();

    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }

    onComplete?.();
  }, [timer.instanceId, onComplete]);

  useEffect(() => {
    setNowMs(Date.now());
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [
    timer.instanceId,
    timer.startedAt,
    timer.durationSeconds,
    timer.pausedAt,
    timer.pausedElapsedSeconds,
  ]);

  // Fallback for mobile/browser throttling: schedule a one-shot completion check.
  useEffect(() => {
    if (isPaused) return;

    const timeoutMs = Math.max(remaining, 0) * 1000;
    const timeout = window.setTimeout(() => {
      const liveRemaining = getRestTimerRemainingSeconds(timer, Date.now());
      if (liveRemaining <= 0) {
        completeTimer();
      }
    }, timeoutMs + 50);

    return () => window.clearTimeout(timeout);
  }, [timer, remaining, isPaused, completeTimer]);

  // When app returns to foreground (common on iPhone lock/unlock), re-check immediately.
  useEffect(() => {
    const syncNow = () => {
      const now = Date.now();
      setNowMs(now);
      if (!timer.pausedAt && getRestTimerRemainingSeconds(timer, now) <= 0) {
        completeTimer();
      }
    };

    window.addEventListener('focus', syncNow);
    window.addEventListener('pageshow', syncNow);
    document.addEventListener('visibilitychange', syncNow);

    return () => {
      window.removeEventListener('focus', syncNow);
      window.removeEventListener('pageshow', syncNow);
      document.removeEventListener('visibilitychange', syncNow);
    };
  }, [timer, completeTimer]);

  useEffect(() => {
    if (remaining > 0) {
      if (completedTimerRef.current === timer.instanceId) {
        completedTimerRef.current = null;
      }
      return;
    }

    completeTimer();
  }, [remaining, timer.instanceId, completeTimer]);

  const progress =
    timer.durationSeconds > 0
      ? ((timer.durationSeconds - remaining) / timer.durationSeconds) * 100
      : 100;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handlePauseToggle = () => {
    if (isPaused) {
      onResume?.();
      return;
    }
    onPause?.();
  };

  const handleComplete = () => {
    onComplete?.();
  };

  const isUrgent = remaining <= 10 && remaining > 0 && !isPaused;

  if (variant === 'footer') {
    return (
      <div
        className={`rounded-2xl p-3 sm:p-4 shadow-sm border transition-colors ${
          isUrgent
            ? 'border-amber-400/40 bg-amber-400/15 animate-pulse'
            : 'border-slate-200 bg-blue-50'
        }`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-slate-700 font-bold uppercase tracking-wider">
              Descanso
            </span>
            <span
              className={`text-4xl font-black font-mono leading-none ${
                isUrgent ? 'text-amber-800' : 'text-primary'
              }`}
            >
              {formatTime(remaining)}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full sm:w-auto">
            <Button variant="ghost"
              onClick={() => onAddSeconds?.(-10)}
              className="px-3 py-2 rounded-lg bg-slate-100 text-slate-800 font-bold hover:bg-slate-200 transition-colors text-sm"
            >
              -10s
            </Button>
            <Button variant="ghost"
              onClick={handlePauseToggle}
              className="px-3 py-2 rounded-lg bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors flex items-center justify-center"
              aria-label={isPaused ? 'Reanudar descanso' : 'Pausar descanso'}
              title={isPaused ? 'Reanudar' : 'Pausar'}
            >
              <span className="material-symbols-outlined text-[20px]">
                {isPaused ? 'play_arrow' : 'pause'}
              </span>
            </Button>
            <Button variant="ghost"
              onClick={() => onAddSeconds?.(10)}
              className="px-3 py-2 rounded-lg bg-slate-100 text-slate-800 font-bold hover:bg-slate-200 transition-colors text-sm"
            >
              +10s
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    const radius = 60;
    const circumference = 2 * Math.PI * radius;

    return (
      <div className="flex flex-col items-center gap-4">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-600">Descanso</div>

        <div className="relative w-40 h-40">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-slate-200"
            />
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              className="text-primary transition-all"
              strokeDasharray={`${circumference}`}
              strokeDashoffset={`${circumference * (1 - progress / 100)}`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-bold font-mono">{formatTime(remaining)}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 w-full">
          <Button variant="ghost"
            onClick={() => onAddSeconds?.(-10)}
            className="rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-sm font-bold text-slate-800 transition-colors hover:bg-slate-100"
          >
            -10s
          </Button>
          <Button variant="ghost"
            onClick={handlePauseToggle}
            className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-slate-800 transition-colors hover:bg-slate-100"
            aria-label={isPaused ? 'Reanudar descanso' : 'Pausar descanso'}
            title={isPaused ? 'Reanudar' : 'Pausar'}
          >
            <span className="material-symbols-outlined text-[20px]">
              {isPaused ? 'play_arrow' : 'pause'}
            </span>
          </Button>
          <Button variant="ghost"
            onClick={() => onAddSeconds?.(10)}
            className="rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-sm font-bold text-slate-800 transition-colors hover:bg-slate-100"
          >
            +10s
          </Button>
        </div>

        {onCancel && (
          <Button variant="ghost"
            onClick={onCancel}
            className="text-sm text-slate-600 transition-colors hover:text-slate-900"
          >
            Cancelar temporizador
          </Button>
        )}
      </div>
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel?.()}>
      <DialogContent className="max-w-sm rounded-[32px] p-8">
        <div className="flex flex-col items-center gap-6">
          <DialogHeader className="items-center text-center">
            <DialogTitle className="text-xl font-semibold">Descanso</DialogTitle>
            <DialogDescription className="sr-only">
              Temporizador de descanso entre series.
            </DialogDescription>
          </DialogHeader>

          <div className="relative w-48 h-48">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-slate-200"
              />
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                className="text-primary transition-all"
                strokeDasharray={`${2 * Math.PI * 88}`}
                strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress / 100)}`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl font-bold font-mono text-slate-900">
                {formatTime(remaining)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 w-full">
            <Button variant="ghost"
              onClick={() => onAddSeconds?.(-10)}
              className="rounded-xl border border-slate-200 bg-slate-50 py-3 font-bold text-slate-800 transition-colors hover:bg-slate-100"
            >
              -10s
            </Button>
            <Button variant="ghost"
              onClick={handlePauseToggle}
              className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 py-3 text-slate-800 transition-colors hover:bg-slate-100"
              aria-label={isPaused ? 'Reanudar descanso' : 'Pausar descanso'}
              title={isPaused ? 'Reanudar' : 'Pausar'}
            >
              <span className="material-symbols-outlined text-[22px]">
                {isPaused ? 'play_arrow' : 'pause'}
              </span>
            </Button>
            <Button variant="ghost"
              onClick={() => onAddSeconds?.(10)}
              className="rounded-xl border border-slate-200 bg-slate-50 py-3 font-bold text-slate-800 transition-colors hover:bg-slate-100"
            >
              +10s
            </Button>
          </div>

          {onCancel && (
            <Button variant="ghost"
              onClick={onCancel}
              className="text-sm text-slate-600 transition-colors hover:text-slate-900"
            >
              Cancelar temporizador
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RestTimer;
