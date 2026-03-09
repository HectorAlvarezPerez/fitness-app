import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import WorkoutStatisticsChart from '../components/dashboard/WorkoutStatisticsChart';
import WorkoutCalendar from '../components/dashboard/WorkoutCalendar';
import GlobalStatsSummary from '../components/dashboard/GlobalStatsSummary';
import MuscleStats from '../components/dashboard/MuscleStats';
import { accumulateMuscleSeriesDistribution } from '../lib/muscleStats';

const Dashboard: React.FC = () => {
  const { stats, workoutHistory, loadWorkoutHistory } = useStore();
  const [muscleStats, setMuscleStats] = useState<Record<string, number>>({});

  useEffect(() => {
    loadWorkoutHistory();
  }, [loadWorkoutHistory]);

  useEffect(() => {
    const muscles: Record<string, number> = {};

    workoutHistory.forEach((workout) => {
      if (Array.isArray(workout.exercises_completed)) {
        const workoutDistribution = accumulateMuscleSeriesDistribution(workout.exercises_completed);
        Object.entries(workoutDistribution).forEach(([muscle, weightedSeries]) => {
          muscles[muscle] = (muscles[muscle] || 0) + weightedSeries;
        });
      }
    });

    setMuscleStats(muscles);
  }, [workoutHistory]);

  if (!stats) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-slate-400">Cargando estadísticas...</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mobile-page max-w-4xl space-y-4">
        <section className="mobile-hero">
          <p className="mobile-kicker">Insights</p>
          <h1 className="mobile-title">Estadísticas</h1>
          <p className="mobile-subtitle">
            Un panel más compacto para entender rápido carga, consistencia y distribución muscular.
          </p>
        </section>

        <div className="mobile-card p-4">
          <GlobalStatsSummary />
        </div>

        <div className="space-y-4 lg:grid lg:grid-cols-[1.6fr_1fr] lg:gap-4 lg:space-y-0">
          <div className="mobile-card h-[350px] p-4">
            <WorkoutStatisticsChart />
          </div>
          <div className="mobile-card p-4">
            <WorkoutCalendar />
          </div>
        </div>

        <div className="mobile-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="mobile-kicker">Distribution</p>
              <h3 className="mt-2 text-xl font-bold text-white">Grupos musculares</h3>
            </div>
            <Link to="/history" className="text-sm font-semibold text-[#4ea0ff]">
              Ver historial
            </Link>
          </div>
          <MuscleStats stats={muscleStats} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
