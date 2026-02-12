import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RestTimerStateLike, getRestTimerRemainingSeconds } from '../lib/restTimer';

interface RestTimerProps {
    timer: RestTimerStateLike & { instanceId: string };
    onComplete?: () => void;
    onCancel?: () => void;
    onPause?: () => void;
    onResume?: () => void;
    onAddSeconds?: (seconds: number) => void;
    variant?: 'modal' | 'footer' | 'inline';
    completeLabel?: string;
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

export const RestTimer: React.FC<RestTimerProps> = ({
    timer,
    onComplete,
    onCancel,
    onPause,
    onResume,
    onAddSeconds,
    variant = 'modal',
    completeLabel = 'Saltar',
}) => {
    const [nowMs, setNowMs] = useState(Date.now());
    const completedTimerRef = useRef<string | null>(null);

    const remaining = useMemo(
        () => getRestTimerRemainingSeconds(timer, nowMs),
        [timer, nowMs]
    );
    const isPaused = Boolean(timer.pausedAt);

    useEffect(() => {
        setNowMs(Date.now());
        const interval = setInterval(() => {
            setNowMs(Date.now());
        }, 1000);

        return () => clearInterval(interval);
    }, [timer.instanceId, timer.startedAt, timer.durationSeconds, timer.pausedAt, timer.pausedElapsedSeconds]);

    useEffect(() => {
        if (remaining > 0) {
            if (completedTimerRef.current === timer.instanceId) {
                completedTimerRef.current = null;
            }
            return;
        }

        if (completedTimerRef.current === timer.instanceId) return;

        completedTimerRef.current = timer.instanceId;
        playDoneTone();

        // Browser notification (lazy permission request)
        const notifPref = localStorage.getItem('fitness-rest-timer-notifications');
        if (notifPref !== 'off') {
            if ('Notification' in window) {
                if (Notification.permission === 'granted') {
                    try { new Notification('⏱ Descanso terminado', { body: 'Hora de la siguiente serie', icon: '/favicon.ico' }); } catch { /* ignore */ }
                } else if (Notification.permission === 'default') {
                    Notification.requestPermission().then(p => {
                        if (p === 'granted') {
                            try { new Notification('⏱ Descanso terminado', { body: 'Hora de la siguiente serie', icon: '/favicon.ico' }); } catch { /* ignore */ }
                        }
                    });
                }
            }
        }

        // Device vibration
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
        }

        onComplete?.();
    }, [remaining, timer.instanceId, onComplete]);

    const progress = timer.durationSeconds > 0
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

    if (variant === 'footer') {
        return (
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between shadow-lg border-t border-white/10">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Descanso</span>
                        <span className="text-3xl font-black font-mono leading-none text-primary">
                            {formatTime(remaining)}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => onAddSeconds?.(10)}
                        className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-colors text-sm"
                    >
                        +10s
                    </button>
                    <button
                        onClick={handlePauseToggle}
                        className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 font-bold hover:bg-slate-700 transition-colors text-sm"
                    >
                        {isPaused ? 'Reanudar' : 'Pausar'}
                    </button>
                    <button
                        onClick={handleComplete}
                        className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition-colors flex items-center gap-2"
                    >
                        {completeLabel}
                        <span className="material-symbols-outlined text-sm">skip_next</span>
                    </button>
                </div>
            </div>
        );
    }

    if (variant === 'inline') {
        const radius = 60;
        const circumference = 2 * Math.PI * radius;

        return (
            <div className="flex flex-col items-center gap-4">
                <div className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 tracking-wider">
                    Descanso
                </div>

                <div className="relative w-40 h-40">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle
                            cx="80"
                            cy="80"
                            r={radius}
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="none"
                            className="text-gray-200 dark:text-gray-700"
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

                <div className="flex gap-2 w-full">
                    <button
                        onClick={handlePauseToggle}
                        className="flex-1 py-2.5 rounded-lg bg-gray-100 dark:bg-surface-dark hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-bold text-sm"
                    >
                        {isPaused ? 'Reanudar' : 'Pausar'}
                    </button>
                    <button
                        onClick={() => onAddSeconds?.(10)}
                        className="flex-1 py-2.5 rounded-lg bg-gray-100 dark:bg-surface-dark hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-bold text-sm"
                    >
                        +10s
                    </button>
                    <button
                        onClick={handleComplete}
                        className="flex-1 py-2.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors font-bold text-sm"
                    >
                        {completeLabel}
                    </button>
                </div>

                {onCancel && (
                    <button
                        onClick={onCancel}
                        className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                        Cancelar temporizador
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#1a2632] rounded-2xl p-8 max-w-sm w-full border border-gray-200 dark:border-surface-border shadow-2xl">
                <div className="flex flex-col items-center gap-6">
                    <h3 className="text-xl font-bold">Descanso</h3>

                    <div className="relative w-48 h-48">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle
                                cx="96"
                                cy="96"
                                r="88"
                                stroke="currentColor"
                                strokeWidth="8"
                                fill="none"
                                className="text-gray-200 dark:text-gray-700"
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
                            <span className="text-5xl font-bold font-mono">{formatTime(remaining)}</span>
                        </div>
                    </div>

                    <div className="flex gap-3 w-full">
                        <button
                            onClick={handlePauseToggle}
                            className="flex-1 py-3 rounded-lg bg-gray-100 dark:bg-surface-dark hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-bold"
                        >
                            {isPaused ? 'Reanudar' : 'Pausar'}
                        </button>
                        <button
                            onClick={() => onAddSeconds?.(10)}
                            className="flex-1 py-3 rounded-lg bg-gray-100 dark:bg-surface-dark hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-bold"
                        >
                            +10s
                        </button>
                        <button
                            onClick={handleComplete}
                            className="flex-1 py-3 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors font-bold"
                        >
                            {completeLabel}
                        </button>
                    </div>

                    {onCancel && (
                        <button
                            onClick={onCancel}
                            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                            Cancelar temporizador
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RestTimer;
