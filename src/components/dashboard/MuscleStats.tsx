import React from 'react';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface MuscleStatsProps {
  stats: Record<string, number>;
}

const MuscleStats: React.FC<MuscleStatsProps> = ({ stats }) => {
  const data = Object.entries(stats)
    .map(([muscle, count]) => ({
      subject: muscle,
      A: count,
      fullMark: Math.max(...Object.values(stats)),
    }))
    .sort((a, b) => b.A - a.A)
    .slice(0, 6);

  const sortedStats = Object.entries(stats).sort((a, b) => b[1] - a[1]);
  const maxCount = sortedStats[0]?.[1] || 1;

  if (Object.keys(stats).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-3 rounded-full border border-white/10 bg-white/5 p-4">
          <span className="material-symbols-outlined text-3xl text-slate-400">fitness_center</span>
        </div>
        <p className="text-slate-400">No hay datos de entrenamiento aún</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 md:flex-row">
      <div className="relative flex min-h-[300px] flex-1 items-center justify-center">
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            <PolarGrid stroke="#284256" strokeOpacity={0.8} />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
            <Radar
              name="Series ponderadas"
              dataKey="A"
              stroke="#ec4913"
              strokeWidth={3}
              fill="#ec4913"
              fillOpacity={0.2}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f2231',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px',
                color: '#fff',
              }}
              itemStyle={{ color: '#fff' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-4">
        {sortedStats.slice(0, 5).map(([muscle, count]) => (
          <div key={muscle} className="group">
            <div className="mb-1 flex justify-between text-sm">
              <span className="font-medium text-slate-200">{muscle}</span>
              <span className="text-slate-400">{count.toFixed(1)} series</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500 ease-out group-hover:bg-primary/80"
                style={{ width: `${(count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}

        {sortedStats.length > 5 && (
          <p className="mt-2 text-center text-xs text-slate-400">
            + {sortedStats.length - 5} grupos musculares más
          </p>
        )}
      </div>
    </div>
  );
};

export default MuscleStats;
