import React, { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';

type TimeRange = 'week' | 'month' | '3months' | 'year';

const GlobalStatsSummary: React.FC = () => {
    const { workoutHistory } = useStore();
    const [range, setRange] = useState<TimeRange>('3months');

    const stats = useMemo(() => {
        const now = new Date();
        let filteredWorkouts = workoutHistory;

        let startDate = new Date();

        switch (range) {
            case 'week':
                startDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate.setDate(now.getDate() - 30);
                break;
            case '3months':
                startDate.setDate(now.getDate() - (12 * 7)); // 12 weeks
                break;
            case 'year':
                startDate.setFullYear(now.getFullYear() - 1);
                break;
        }

        // Apply date filter
        filteredWorkouts = workoutHistory.filter(w => {
            const wDate = new Date(w.completed_at);
            return wDate >= startDate && wDate <= now;
        });

        // Calculate totals
        const sessions = filteredWorkouts.length;

        const totalDurationMinutes = filteredWorkouts.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0);
        const hours = Math.floor(totalDurationMinutes / 60);
        const minutes = totalDurationMinutes % 60;

        const totalVolumeInGrams = filteredWorkouts.reduce((acc, curr) => acc + (curr.total_volume || 0), 0);
        const volumeK = totalVolumeInGrams / 1000;

        return {
            sessions,
            time: `${hours}h ${minutes}m`,
            volume: `${volumeK.toFixed(1)}k kg`
        };
    }, [workoutHistory, range]);

    return (
        <div className="bg-white dark:bg-[#1a2632] rounded-2xl border border-slate-200 dark:border-[#233648] p-5">
            <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
                <h3 className="text-lg font-bold">Resumen Global</h3>

                {/* Range Selector */}
                <div className="relative self-stretch md:self-auto">
                    <select
                        value={range}
                        onChange={(e) => setRange(e.target.value as TimeRange)}
                        className="w-full md:w-auto appearance-none bg-gray-50 dark:bg-[#0f1820] border border-gray-200 dark:border-[#233648] text-slate-700 dark:text-gray-300 py-2 pl-4 pr-10 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                    >
                        <option value="week">Última semana</option>
                        <option value="month">Último mes</option>
                        <option value="3months">Últimos 3 meses</option>
                        <option value="year">Último año</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                        <span className="material-symbols-outlined text-[20px]">expand_more</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-1 items-center md:items-start text-center md:text-left">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Volumen Total</p>
                    <p className="text-3xl font-black text-slate-800 dark:text-white">{stats.volume}</p>
                </div>

                <div className="hidden md:block w-px bg-gray-200 dark:bg-gray-700 self-stretch"></div>
                <div className="md:hidden h-px bg-gray-100 dark:bg-gray-800 w-full"></div>

                <div className="flex flex-col gap-1 items-center md:items-start text-center md:text-left">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Sesiones</p>
                    <p className="text-3xl font-black text-slate-800 dark:text-white">{stats.sessions}</p>
                </div>

                <div className="hidden md:block w-px bg-gray-200 dark:bg-gray-700 self-stretch"></div>
                <div className="md:hidden h-px bg-gray-100 dark:bg-gray-800 w-full"></div>

                <div className="flex flex-col gap-1 items-center md:items-start text-center md:text-left">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Tiempo Total</p>
                    <p className="text-3xl font-black text-slate-800 dark:text-white">{stats.time}</p>
                </div>
            </div>
        </div>
    );
};

export default GlobalStatsSummary;
