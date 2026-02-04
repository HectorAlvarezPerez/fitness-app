import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useStore } from '../../store/useStore';

type Metric = 'duration' | 'reps' | 'volume';
type TimeRange = 'week' | 'month' | '3months' | 'year';

const WorkoutStatisticsChart: React.FC = () => {
    const { workoutHistory } = useStore();
    const [metric, setMetric] = useState<Metric>('duration');
    const [range, setRange] = useState<TimeRange>('3months'); // Default to match image style "Last 12 weeks"

    const processData = useMemo(() => {
        const now = new Date();
        let data: any[] = [];
        let dateFormat: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };

        // Helper to sum reps
        const sumReps = (workout: any) => {
            if (!workout.exercises_completed || !Array.isArray(workout.exercises_completed)) return 0;
            return workout.exercises_completed.reduce((acc: number, ex: any) => {
                const setReps = Array.isArray(ex.sets)
                    ? ex.sets.reduce((sAcc: number, s: any) => sAcc + (Number(s.reps) || 0), 0)
                    : 0;
                return acc + setReps;
            }, 0);
        };

        const getMetricValue = (workout: any) => {
            switch (metric) {
                case 'duration': return workout.duration_minutes || 0;
                case 'volume': return (workout.total_volume || 0) / 1000; // Convert to k
                case 'reps': return sumReps(workout);
                default: return 0;
            }
        };

        if (range === 'week' || range === 'month') {
            // Daily grouping
            const daysBack = range === 'week' ? 7 : 30;
            const startDate = new Date();
            startDate.setDate(now.getDate() - daysBack);

            // Create placeholder days
            for (let i = 0; i < daysBack; i++) {
                const d = new Date(startDate);
                d.setDate(startDate.getDate() + i + 1);
                const dayStr = d.toISOString().split('T')[0];

                // Find workouts on this day
                const daysWorkouts = workoutHistory.filter(w => w.completed_at.startsWith(dayStr));
                const totalVal = daysWorkouts.reduce((acc, w) => acc + getMetricValue(w), 0);

                data.push({
                    name: d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
                    value: totalVal,
                    date: d
                });
            }
        } else if (range === '3months') {
            // Weekly grouping (Last 12 weeks)
            const weeksBack = 12;
            const startDate = new Date();
            startDate.setDate(now.getDate() - (weeksBack * 7));

            // Align to start of week (Monday)
            const day = startDate.getDay() || 7;
            if (day !== 1) startDate.setDate(startDate.getDate() - day + 1);

            for (let i = 0; i < weeksBack; i++) {
                const weekStart = new Date(startDate);
                weekStart.setDate(startDate.getDate() + (i * 7));
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);

                // Find workouts in this week
                const weeksWorkouts = workoutHistory.filter(w => {
                    const wDate = new Date(w.completed_at);
                    return wDate >= weekStart && wDate <= weekEnd;
                });

                const totalVal = weeksWorkouts.reduce((acc, w) => acc + getMetricValue(w), 0);

                data.push({
                    name: weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
                    value: totalVal,
                    fullDate: `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`
                });
            }
        } else if (range === 'year') {
            // Monthly grouping
            const monthsBack = 12;
            const startDate = new Date();
            startDate.setMonth(now.getMonth() - monthsBack + 1);
            startDate.setDate(1);

            for (let i = 0; i < monthsBack; i++) {
                const monthDate = new Date(startDate);
                monthDate.setMonth(startDate.getMonth() + i);

                const monthsWorkouts = workoutHistory.filter(w => {
                    const wDate = new Date(w.completed_at);
                    return wDate.getMonth() === monthDate.getMonth() && wDate.getFullYear() === monthDate.getFullYear();
                });

                const totalVal = monthsWorkouts.reduce((acc, w) => acc + getMetricValue(w), 0);

                data.push({
                    name: monthDate.toLocaleDateString('es-ES', { month: 'short' }),
                    value: totalVal
                });
            }
        }

        return data;
    }, [workoutHistory, metric, range]);

    const getUnitLabel = () => {
        switch (metric) {
            case 'duration': return 'min';
            case 'volume': return 'k kg';
            case 'reps': return 'reps';
            default: return '';
        }
    };

    const getTotalForPeriod = () => {
        const sum = processData.reduce((acc, curr) => acc + curr.value, 0);
        return metric === 'volume' ? sum.toFixed(1) : Math.round(sum);
    };

    return (
        <div className="bg-white dark:bg-[#1a2632] rounded-2xl border border-slate-200 dark:border-[#233648] p-6 h-full flex flex-col">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <h3 className="text-lg font-bold">Estadísticas</h3>

                {/* Metric Selector */}
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg self-start md:self-auto">
                    {(['duration', 'reps', 'volume'] as const).map((m) => (
                        <button
                            key={m}
                            onClick={() => setMetric(m)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${metric === m
                                    ? 'bg-white dark:bg-[#233648] text-slate-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            {m === 'duration' ? 'Duración' : m === 'reps' ? 'Reps' : 'Volumen'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex items-end justify-between mb-8">
                <div>
                    <p className="text-4xl font-bold flex items-baseline gap-2">
                        {getTotalForPeriod()}
                        <span className="text-lg font-normal text-gray-500">{getUnitLabel()}</span>
                    </p>
                    <p className="text-sm text-gray-500 capitalize">
                        {range === 'week' ? 'Esta semana' : range === 'month' ? 'Este mes' : range === '3months' ? 'Últimos 3 meses' : 'Este año'}
                    </p>
                </div>

                {/* Range Selector */}
                <div className="relative">
                    <select
                        value={range}
                        onChange={(e) => setRange(e.target.value as TimeRange)}
                        className="appearance-none bg-white dark:bg-[#0f1820] border border-slate-200 dark:border-[#233648] text-slate-700 dark:text-gray-300 py-2 pl-4 pr-10 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
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

            {/* Chart */}
            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={processData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.3} />
                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 11, fill: '#94a3b8' }}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                        />
                        <YAxis
                            tick={{ fontSize: 11, fill: '#94a3b8' }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            cursor={{ fill: 'rgba(236, 73, 19, 0.1)', radius: 4 }}
                            contentStyle={{
                                backgroundColor: '#1A1D21',
                                border: 'none',
                                borderRadius: '12px',
                                padding: '12px',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                            }}
                            labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontSize: '12px' }}
                            itemStyle={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}
                            formatter={(value: number) => [`${value} ${getUnitLabel()}`, metric === 'duration' ? 'Duración' : metric === 'reps' ? 'Repeticiones' : 'Volumen']}
                        />
                        <Bar
                            dataKey="value"
                            fill="#ec4913"
                            radius={[4, 4, 0, 0]}
                            barSize={range === 'week' ? 40 : range === 'month' ? 12 : 20}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default WorkoutStatisticsChart;
