import React, { useMemo, useState } from 'react';
import { useStore } from '../../store/useStore';

type TimeRange = 'week' | 'month' | '3months' | 'year';

const GlobalStatsSummary: React.FC = () => {
  const { workoutHistory } = useStore();
  const [range, setRange] = useState<TimeRange>('3months');

  const stats = useMemo(() => {
    const now = new Date();
    let filteredWorkouts = workoutHistory;

    const startDate = new Date();

    switch (range) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setDate(now.getDate() - 30);
        break;
      case '3months':
        startDate.setDate(now.getDate() - 12 * 7);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    filteredWorkouts = workoutHistory.filter((w) => {
      const wDate = new Date(w.completed_at);
      return wDate >= startDate && wDate <= now;
    });

    const sessions = filteredWorkouts.length;
    const totalDurationMinutes = filteredWorkouts.reduce(
      (acc, curr) => acc + (curr.duration_minutes || 0),
      0
    );
    const hours = Math.floor(totalDurationMinutes / 60);
    const minutes = totalDurationMinutes % 60;

    const totalVolumeInGrams = filteredWorkouts.reduce(
      (acc, curr) => acc + (curr.total_volume || 0),
      0
    );
    const volumeK = totalVolumeInGrams / 1000;

    return {
      sessions,
      time: `${hours}h ${minutes}m`,
      volume: `${volumeK.toFixed(1)}k kg`,
    };
  }, [workoutHistory, range]);

  return (
    <div className="mobile-card">
      <div className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Dashboard
          </p>
          <h3 className="mt-1 text-lg font-semibold text-white">Resumen global</h3>
        </div>
        <div className="relative self-stretch md:self-auto">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as TimeRange)}
            className="w-full appearance-none rounded-full border border-white/10 bg-white/5 py-2.5 pl-4 pr-10 text-sm font-medium text-slate-200 outline-none transition-colors focus:border-primary md:w-auto"
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

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Volumen total</p>
          <p className="mt-2 text-3xl font-semibold text-white">{stats.volume}</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Sesiones</p>
          <p className="mt-2 text-3xl font-semibold text-white">{stats.sessions}</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Tiempo total</p>
          <p className="mt-2 text-3xl font-semibold text-white">{stats.time}</p>
        </div>
      </div>
    </div>
  );
};

export default GlobalStatsSummary;
