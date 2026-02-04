import React, { useState, useEffect } from 'react';

interface WorkoutTimerProps {
    startedAt: string;
}

export const WorkoutTimer: React.FC<WorkoutTimerProps> = ({ startedAt }) => {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const startTime = new Date(startedAt).getTime();

        const updateTimer = () => {
            const now = Date.now();
            const diff = Math.floor((now - startTime) / 1000);
            setElapsed(diff);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [startedAt]);

    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;

    return (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
            <span className="material-symbols-outlined text-primary text-[20px]">timer</span>
            <span className="font-mono font-bold text-primary">
                {hours > 0 && `${hours.toString().padStart(2, '0')}:`}
                {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
            </span>
        </div>
    );
};

export default WorkoutTimer;
