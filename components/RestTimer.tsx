import React, { useState, useEffect, useRef } from 'react';

interface RestTimerProps {
    duration: number; // seconds
    onComplete?: () => void;
    onCancel?: () => void;
    variant?: 'modal' | 'footer' | 'inline';
}

export const RestTimer: React.FC<RestTimerProps> = ({ duration, onComplete, onCancel, variant = 'modal' }) => {
    const [remaining, setRemaining] = useState(duration);
    const [isActive, setIsActive] = useState(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (!isActive || remaining <= 0) return;

        const interval = setInterval(() => {
            setRemaining(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    // Play sound
                    if (audioRef.current) {
                        audioRef.current.play().catch(() => { /* ignore */ });
                    }
                    onComplete?.();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isActive, onComplete, remaining]);

    const handleToggle = () => setIsActive(!isActive);
    const handleSkip = () => {
        setRemaining(0);
        onComplete?.();
    };

    const progress = ((duration - remaining) / duration) * 100;
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
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

                {/* Audio element for notification sound */}
                <audio ref={audioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSyAzvLTgjMGHGS57OihUBELTKXh8bllHAU2jdXyzn0vBSp+zPLYizcIGWi77eqeUBELTKXh8bllHAU2jdXyzn0vBSp+zPLYizcIG2i87eqeUBEKT6ni9LpoIAYrgsz03IU1BxlptO3qn08RAM+p4/S4ZRwFN4/W88p4KwYngcvz24k3CBlotO3rn08RAM+p4/S4ZRwFN4/W88p4KwYngcvz24k3CBlotO3rn08RAM+p4/S4ZRwFN4/W88p4KwYngcvz24k3CBlotO3rn08RAM+q5PS4ZRwFN4/W88p4KwYngcvz24k3CBlotO3sn08RAM+q5PS4ZRwFN4/W88p4KwYngcvz24k3CBlotO3sn08RAM+q5PS4ZRwFN4/W88p4KwYngcvz24k3CBlotO3sn08RAM+q5PS4ZRwFOY/W88t4KwQpf8rx25A2Bxdptuzrn08RANCr5fS4ZRsFOI/X88t4KgUpf8rx25A2Bxdptuzrn08RANCr5fS4ZRsFOJDX88t3KgUpf8rx25A2Bxdpt+zroE8RANCr5fS4ZRsFOJDX88t3KgUpf8rx25A2Bxdpt+zroE8RANCr5fS4ZRsFOJDX88t3KgUpf8rx25A2Bxdpt+zroE8RANCr5fS4ZRsFOJDX88t3KgUpf8rx25A2Bxdpt+zroE8RANCr5fS4ZRsFOJDX88t3KgUpf8rx25A2Bxdpt+zroE8RANCr5fS4ZRsFOJDX88t3KgUpf8rx25A2BxdptuzroE8RANCE5fS4ZRsFOJDX88t3KgUpf8rx25A2Bxdptuzrn08RANCr5fS4ZhsFOJDX88t3KgQpf8rx25A2Bxdpt+zroE8RANCr5fS4ZhsFOJDX88t3KgQpf8rx25A2Bxdpt+zroE8RANCr5fS4ZhsFOJDY88t3KgQpf8vx25A2Bxdpt+zroE8RANCr5fS4ZhsFOpHY88t3KgQpf8vx25A2Bxdpt+zroE8RANCr5fS4ZhsFOpHY88t3KgQpf8vx25A2Bxdpt+zroE8RANCr5fS4ZhsFOpHY88t3KgQpf8vx25A2Bxdpt+zroE8RANCr5fS4ZhsFOpHY88t3KgQpf8vx25A2Bxdpt+zroE8RANCs5fS4ZhsFOpHY88t3KgQpf8vx25A2Bxdpt+zroE8RANCs5fS4ZhsFOpHY88t3KgQpf8vx25A2Bxdpt+zroE8RANCs5fS4ZRsFOpHY88t3KgQpf8vx25A2Bxdpt+zroE8RANCs5fS4ZRsFOpHY88t3KgQpf8vx25A2Bxdpt+zroE8RANCs5fS4ZRsFOpHY88t3KgQpf8vx25A2Bxdpt+zroE8RANCs5fS4ZRsFOpHYdJt+zroE8RANCs5fS4ZRsFOpHY88t3KgQpf8vx25A2Bxdpt+zroE8RANCs5fS4ZRsFOpHY88t3KgQpf8vx25A2Bxdpt+zroE8RANCs5fS4ZRsFOpHY88t3KgQpf8vx25A2Bxdpt+zroE8RANCs5fS4ZRsFOpHY88t3KgQpf8vx25A2Bxdpt+zroE8RANCs5fS4ZRsFOpHY88t3KgQpf8vx25A2Bxdpt+zroE8RANCs5fS4ZRsFOpHY88t3KgQpf8vx25A2Bxdpt+zroE8R" />

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            setRemaining(prev => prev + 10);
                        }}
                        className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-colors text-sm"
                    >
                        +10s
                    </button>
                    <button
                        onClick={handleSkip}
                        className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition-colors flex items-center gap-2"
                    >
                        Saltar
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
                        onClick={handleToggle}
                        className="flex-1 py-2.5 rounded-lg bg-gray-100 dark:bg-surface-dark hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-bold text-sm"
                    >
                        {isActive ? 'Pausar' : 'Reanudar'}
                    </button>
                    <button
                        onClick={() => {
                            setRemaining(prev => prev + 10);
                        }}
                        className="flex-1 py-2.5 rounded-lg bg-gray-100 dark:bg-surface-dark hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-bold text-sm"
                    >
                        +10s
                    </button>
                    <button
                        onClick={handleSkip}
                        className="flex-1 py-2.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors font-bold text-sm"
                    >
                        Saltar
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

                    {/* Circular Progress */}
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

                    {/* Controls */}
                    <div className="flex gap-3 w-full">
                        <button
                            onClick={handleToggle}
                            className="flex-1 py-3 rounded-lg bg-gray-100 dark:bg-surface-dark hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-bold"
                        >
                            {isActive ? 'Pausar' : 'Reanudar'}
                        </button>
                        <button
                            onClick={() => {
                                setRemaining(prev => prev + 10);
                            }}
                            className="flex-1 py-3 rounded-lg bg-gray-100 dark:bg-surface-dark hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-bold"
                        >
                            +10s
                        </button>
                        <button
                            onClick={handleSkip}
                            className="flex-1 py-3 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors font-bold"
                        >
                            Saltar
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

            {/* Audio element for notification sound */}
            <audio ref={audioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSyAzvLTgjMGHGS57OihUBELTKXh8bllHAU2jdXyzn0vBSp+zPLYizcIGWi77eqeUBELTKXh8bllHAU2jdXyzn0vBSp+zPLYizcIG2i87eqeUBEKT6ni9LpoIAYrgsz03IU1BxlptO3qn08RAM+p4/S4ZRwFN4/W88p4KwYngcvz24k3CBlotO3rn08RAM+p4/S4ZRwFN4/W88p4KwYngcvz24k3CBlotO3rn08RAM+p4/S4ZRwFN4/W88p4KwYngcvz24k3CBlotO3rn08RAM+q5PS4ZRwFN4/W88p4KwYngcvz24k3CBlotO3sn08RAM+q5PS4ZRwFN4/W88p4KwYngcvz24k3CBlotO3sn08RAM+q5PS4ZRwFN4/W88p4KwYngcvz24k3CBlotO3sn08RAM+q5PS4ZRwFOY/W88t4KwQpf8rx25A2Bxdptuzrn08RANCr5fS4ZRsFOI/X88t4KgUpf8rx25A2Bxdptuzrn08RANCr5fS4ZRsFOJDX88t3KgUpf8rx25A2Bxdpt+zroE8RANCr5fS4ZRsFOJDX88t3KgUpf8rx25A2Bxdpt+zroE8RANCr5fS4ZRsFOJDX88t3KgUpf8rx25A2Bxdpt+zroE8RANCr5fS4ZRsFOJDX88t3KgUpf8rx25A2Bxdpt+zroE8RANCr5fS4ZRsFOJDX88t3KgUpf8rx25A2Bxdpt+zroE8RANCr5fS4ZRsFOJDX88t3KgUpf8rx25A2BxdptuzroE8RANCE5fS4ZRsFOJDX88t3KgUpf8rx25A2Bxdptuzrn08RANCr5fS4ZhsFOJDX88t3KgQpf8rx25A2Bxdpt+zroE8RANCr5fS4ZhsFOJDX88t3KgQpf8rx25A2Bxdpt+zroE8RANCr5fS4ZhsFOJDY88t3KgQpf8vx25A2Bxdpt+zroE8RANCr5fS4ZhsFOpHY88t3KgQpf8vx25A2Bxdpt+zroE8RANCr5fS4ZhsFOpHY88t3KgQpf8vx25A2Bxdpt+zroE8RANCr5fS4ZhsFOpHY88t3KgQpf8vx25A2Bxdpt+zroE8RANCr5fS4ZhsFOpHY88t3KgQpf8vx25A2Bxdpt+zroE8RANCs5fS4ZhsFOpHY88t3KgQpf8vx25A2Bxdpt+zroE8RANCs5fS4ZhsFOpHY88t3KgQpf8vx25A2Bxdpt+zroE8RANCs5fS4ZRsFOpHY88t3KgQpf8vx25A2Bxdpt+zroE8RANCs5fS4ZRsFOpHY88t3KgQpf8vx25A2Bxdpt+zroE8RANCs5fS4ZRsFOpHY88t3KgQpf8vx25A2Bxdpt+zroE8RANCs5fS4ZRsFOpHYdJt+zroE8RANCs5fS4ZRsFOpHY88t3KgQpf8vx25A2Bxdpt+zroE8RANCs5fS4ZRsFOpHY88t3KgQpf8vx25A2Bxdpt+zroE8RANCs5fS4ZRsFOpHY88t3KgQpf8vx25A2Bxdpt+zroE8RANCs5fS4ZRsFOpHY88t3KgQpf8vx25A2Bxdpt+zroE8RANCs5fS4ZRsFOpHY88t3KgQpf8vx25A2Bxdpt+zroE8RANCs5fS4ZRsFOpHY88t3KgQpf8vx25A2Bxdpt+zroE8R" />
        </div>
    );
};

export default RestTimer;
