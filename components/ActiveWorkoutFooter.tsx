import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';

export const ActiveWorkoutFooter: React.FC = () => {
    const { activeWorkout, pauseWorkout, resumeWorkout, finishWorkout } = useStore();
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        if (!activeWorkout) return;

        // Calculate elapsed time accounting for paused time
        const calculateElapsed = () => {
            const startTime = new Date(activeWorkout.startedAt).getTime();
            const currentTime = new Date().getTime();
            const totalElapsed = currentTime - startTime;
            const pausedTime = activeWorkout.totalPausedMs || 0;

            // If currently paused, don't include the current pause duration
            let currentPauseDuration = 0;
            if (activeWorkout.isPaused && activeWorkout.pausedAt) {
                currentPauseDuration = currentTime - new Date(activeWorkout.pausedAt).getTime();
            }

            return Math.floor((totalElapsed - pausedTime - currentPauseDuration) / 1000);
        };

        // Update immediately
        setElapsedSeconds(calculateElapsed());

        // Update every second if not paused
        if (!activeWorkout.isPaused) {
            const interval = setInterval(() => {
                setElapsedSeconds(calculateElapsed());
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [activeWorkout, activeWorkout?.isPaused]);

    if (!activeWorkout) return null;

    const formatTime = (totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Find current exercise (first incomplete one)
    const currentExercise = activeWorkout.exercises.find(ex =>
        ex.sets.some(set => !set.completed)
    ) || activeWorkout.exercises[activeWorkout.exercises.length - 1];

    const handleFooterClick = () => {
        if (activeWorkout.routineId) {
            navigate(`/routine/${activeWorkout.routineId}/workout`);
        }
    };

    return (
        <div className="fixed left-0 right-0 bottom-[calc(72px+env(safe-area-inset-bottom))] md:bottom-0 bg-primary/95 backdrop-blur-md border-t border-primary-600 shadow-2xl z-30 transition-all">
            <div className="max-w-4xl mx-auto px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <div className="flex items-center justify-between gap-3">
                    {/* Left: Info - Clickable */}
                    <div
                        className="flex-1 flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={handleFooterClick}
                    >
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-white text-[24px] animate-pulse">
                                fitness_center
                            </span>
                            <div className="flex flex-col">
                                <span className="text-white font-bold text-sm leading-tight">
                                    {activeWorkout.routineName}
                                </span>
                                <span className="text-white/80 text-xs leading-tight">
                                    {currentExercise.name}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Center: Timer */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/20 rounded-full">
                        <span className="material-symbols-outlined text-white text-[18px]">
                            timer
                        </span>
                        <span className="text-white font-bold text-sm tabular-nums">
                            {formatTime(elapsedSeconds)}
                        </span>
                    </div>

                    {/* Right: Controls */}
                    <div className="flex items-center gap-1">
                        {/* Finish Button */}
                        <button
                            onClick={() => {
                                const confirmed = confirm('¿Finalizar entrenamiento?');
                                if (confirmed) {
                                    navigate('/dashboard');
                                    setTimeout(() => {
                                        finishWorkout();
                                    }, 100);
                                }
                            }}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                            title="Finalizar entrenamiento"
                        >
                            <span className="material-symbols-outlined text-[24px]">flag</span>
                        </button>

                        {/* Pause/Resume Button */}
                        <button
                            onClick={activeWorkout.isPaused ? resumeWorkout : pauseWorkout}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                        >
                            <span className="material-symbols-outlined text-[24px]">
                                {activeWorkout.isPaused ? 'play_arrow' : 'pause'}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
