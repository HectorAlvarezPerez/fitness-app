import React, { useState, useEffect } from 'react';
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
        // Calculate muscle group stats by weighted series distribution.
        const muscles: Record<string, number> = {};

        workoutHistory.forEach(workout => {
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
                <p className="text-gray-500">Cargando estadísticas...</p>
            </div>
        );
    }

    return (
        <div className="h-full w-full overflow-y-auto p-4 md:p-6">
            <div className="flex flex-col max-w-4xl mx-auto flex-1 gap-4 pb-20">
                <header className="flex flex-col gap-1">
                    <h1 className="text-2xl md:text-3xl font-black">Estadísticas</h1>
                    <p className="text-gray-500 dark:text-gray-400">Tu progreso semanal.</p>
                </header>

                <GlobalStatsSummary />

                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Advanced Statistics Chart */}
                    <div className="flex-[2] h-[350px]">
                        <WorkoutStatisticsChart />
                    </div>

                    {/* Calendar */}
                    <div className="flex-1">
                        <WorkoutCalendar />
                    </div>
                </div>

                {/* Muscle Group Statistics */}
                <div className="rounded-2xl bg-white dark:bg-[#1a2632] p-4">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-base font-bold">Grupos Musculares</h3>
                        <Link to="/history" className="text-sm text-primary hover:underline font-medium">
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
