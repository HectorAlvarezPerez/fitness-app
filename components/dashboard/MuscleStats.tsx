import React from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';

interface MuscleStatsProps {
    stats: Record<string, number>;
}

const MuscleStats: React.FC<MuscleStatsProps> = ({ stats }) => {
    const data = Object.entries(stats)
        .map(([muscle, count]) => ({
            subject: muscle,
            A: count,
            fullMark: Math.max(...Object.values(stats))
        }))
        .sort((a, b) => b.A - a.A)
        .slice(0, 6); // Top 6 for chart clarity, otherwise radar gets messy

    // Sort for the list view (all)
    const sortedStats = Object.entries(stats).sort((a, b) => b[1] - a[1]);
    const maxCount = sortedStats[0]?.[1] || 1;

    if (Object.keys(stats).length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-3">
                    <span className="material-symbols-outlined text-gray-400 text-3xl">fitness_center</span>
                </div>
                <p className="text-gray-500 dark:text-gray-400">No hay datos de entrenamiento aún</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col md:flex-row gap-8">
            {/* Radar Chart Section */}
            <div className="flex-1 min-h-[300px] relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height={300}>
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                        <PolarGrid stroke="#e2e8f0" strokeOpacity={0.5} />
                        <PolarAngleAxis
                            dataKey="subject"
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                        />
                        <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                        <Radar
                            name="Ejercicios"
                            dataKey="A"
                            stroke="#ec4913"
                            strokeWidth={3}
                            fill="#ec4913"
                            fillOpacity={0.2}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1A1D21',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#fff'
                            }}
                            itemStyle={{ color: '#fff' }}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>

            {/* List/Progress Bar Section */}
            <div className="flex-1 flex flex-col justify-center gap-4">
                {sortedStats.slice(0, 5).map(([muscle, count]) => (
                    <div key={muscle} className="group">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-slate-700 dark:text-slate-200">{muscle}</span>
                            <span className="text-slate-500 dark:text-slate-400">{count} ejercicios</span>
                        </div>
                        <div className="h-2.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary rounded-full transition-all duration-500 ease-out group-hover:bg-primary/80"
                                style={{ width: `${(count / maxCount) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                ))}

                {sortedStats.length > 5 && (
                    <p className="text-xs text-center text-gray-500 mt-2">
                        + {sortedStats.length - 5} grupos musculares más
                    </p>
                )}
            </div>
        </div>
    );
};

export default MuscleStats;
