import React, { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '../../store/useStore';

type Metric = 'duration' | 'reps' | 'volume';
type TimeRange = 'week' | 'month' | '3months' | 'year';

const WorkoutStatisticsChart: React.FC = () => {
  const { workoutHistory } = useStore();
  const [metric, setMetric] = useState<Metric>('duration');
  const [range, setRange] = useState<TimeRange>('3months');

  const processData = useMemo(() => {
    const now = new Date();
    const data: any[] = [];

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
        case 'duration':
          return workout.duration_minutes || 0;
        case 'volume':
          return (workout.total_volume || 0) / 1000;
        case 'reps':
          return sumReps(workout);
        default:
          return 0;
      }
    };

    if (range === 'week' || range === 'month') {
      const daysBack = range === 'week' ? 7 : 30;
      const startDate = new Date();
      startDate.setDate(now.getDate() - daysBack);

      for (let i = 0; i < daysBack; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i + 1);
        const dayStr = d.toISOString().split('T')[0];
        const daysWorkouts = workoutHistory.filter((w) => w.completed_at.startsWith(dayStr));
        const totalVal = daysWorkouts.reduce((acc, w) => acc + getMetricValue(w), 0);

        data.push({
          name: d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
          value: totalVal,
          date: d,
        });
      }
    } else if (range === '3months') {
      const weeksBack = 12;
      const startDate = new Date();
      startDate.setDate(now.getDate() - weeksBack * 7);

      const day = startDate.getDay() || 7;
      if (day !== 1) startDate.setDate(startDate.getDate() - day + 1);

      for (let i = 0; i < weeksBack; i++) {
        const weekStart = new Date(startDate);
        weekStart.setDate(startDate.getDate() + i * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const weeksWorkouts = workoutHistory.filter((w) => {
          const wDate = new Date(w.completed_at);
          return wDate >= weekStart && wDate <= weekEnd;
        });

        const totalVal = weeksWorkouts.reduce((acc, w) => acc + getMetricValue(w), 0);

        data.push({
          name: weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
          value: totalVal,
          fullDate: `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`,
        });
      }
    } else if (range === 'year') {
      const monthsBack = 12;
      const startDate = new Date();
      startDate.setMonth(now.getMonth() - monthsBack + 1);
      startDate.setDate(1);

      for (let i = 0; i < monthsBack; i++) {
        const monthDate = new Date(startDate);
        monthDate.setMonth(startDate.getMonth() + i);

        const monthsWorkouts = workoutHistory.filter((w) => {
          const wDate = new Date(w.completed_at);
          return (
            wDate.getMonth() === monthDate.getMonth() &&
            wDate.getFullYear() === monthDate.getFullYear()
          );
        });

        const totalVal = monthsWorkouts.reduce((acc, w) => acc + getMetricValue(w), 0);

        data.push({
          name: monthDate.toLocaleDateString('es-ES', { month: 'short' }),
          value: totalVal,
        });
      }
    }

    return data;
  }, [workoutHistory, metric, range]);

  const getUnitLabel = () => {
    switch (metric) {
      case 'duration':
        return 'min';
      case 'volume':
        return 'k kg';
      case 'reps':
        return 'reps';
      default:
        return '';
    }
  };

  const getTotalForPeriod = () => {
    const sum = processData.reduce((acc, curr) => acc + curr.value, 0);
    return metric === 'volume' ? sum.toFixed(1) : Math.round(sum);
  };

  return (
    <div className="mobile-card flex h-full flex-col">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Rendimiento
          </p>
          <h3 className="mt-1 text-lg font-semibold text-white">Estadísticas</h3>
        </div>

        <div className="flex self-start rounded-full border border-white/10 bg-white/5 p-1 md:self-auto">
          {(['duration', 'reps', 'volume'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all capitalize ${
                metric === m
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {m === 'duration' ? 'Duración' : m === 'reps' ? 'Reps' : 'Volumen'}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="flex items-baseline gap-2 text-4xl font-semibold text-white">
            {getTotalForPeriod()}
            <span className="text-lg font-normal text-slate-400">{getUnitLabel()}</span>
          </p>
          <p className="text-sm text-slate-400 capitalize">
            {range === 'week'
              ? 'Esta semana'
              : range === 'month'
                ? 'Este mes'
                : range === '3months'
                  ? 'Últimos 3 meses'
                  : 'Este año'}
          </p>
        </div>

        <div className="relative">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as TimeRange)}
            className="appearance-none rounded-full border border-white/10 bg-white/5 py-2.5 pl-4 pr-10 text-sm font-medium text-slate-200 outline-none transition-colors focus:border-primary"
          >
            <option value="week">Última semana</option>
            <option value="month">Último mes</option>
            <option value="3months">Últimos 3 meses</option>
            <option value="year">Último año</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
            <span className="material-symbols-outlined text-[20px]">expand_more</span>
          </div>
        </div>
      </div>

      <div className="min-h-0 w-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={processData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#284256" opacity={0.45} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: 'rgba(236, 73, 19, 0.1)', radius: 4 }}
              contentStyle={{
                backgroundColor: '#0f2231',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px',
                padding: '12px',
                boxShadow: '0 16px 30px rgba(0, 0, 0, 0.28)',
              }}
              labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontSize: '12px' }}
              itemStyle={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}
              formatter={(value: number) => [
                `${value} ${getUnitLabel()}`,
                metric === 'duration' ? 'Duración' : metric === 'reps' ? 'Repeticiones' : 'Volumen',
              ]}
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
