import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import WorkoutStatisticsChart from '../components/dashboard/WorkoutStatisticsChart';
import WorkoutCalendar from '../components/dashboard/WorkoutCalendar';
import GlobalStatsSummary from '../components/dashboard/GlobalStatsSummary';
import MuscleStats from '../components/dashboard/MuscleStats';

const Dashboard: React.FC = () => {
    const { stats, workoutHistory, loadWorkoutHistory } = useStore();
    const [muscleStats, setMuscleStats] = useState<Record<string, number>>({});


    useEffect(() => {
        loadWorkoutHistory();
    }, [loadWorkoutHistory]);

    useEffect(() => {
        // Calculate muscle group stats
        const muscles: Record<string, number> = {};

        workoutHistory.forEach(workout => {
            if (Array.isArray(workout.exercises_completed)) {
                workout.exercises_completed.forEach((ex: any) => {
                    const muscle = ex.primaryMuscle || 'Otro';
                    muscles[muscle] = (muscles[muscle] || 0) + 1;
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
        <div className="h-full w-full overflow-y-auto p-4 md:p-8">
            <div className="flex flex-col max-w-4xl mx-auto flex-1 gap-6 pb-20">
                <header className="flex flex-col gap-2">
                    <h1 className="text-3xl md:text-4xl font-black">Estadísticas</h1>
                    <p className="text-gray-500 dark:text-gray-400">Tu progreso semanal en números.</p>
                </header>

                <div className="mb-4">
                    <GlobalStatsSummary />
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Advanced Statistics Chart */}
                    <div className="flex-[2] h-[450px]">
                        <WorkoutStatisticsChart />
                    </div>

                    {/* Calendar */}
                    <div className="flex-1">
                        <WorkoutCalendar />
                    </div>
                </div>

                {/* Muscle Group Statistics */}
                <div className="rounded-2xl border border-slate-200 dark:border-[#233648] bg-white dark:bg-[#1a2632] p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-bold">Grupos Musculares</h3>
                        <Link to="/history" className="text-sm text-primary hover:underline font-medium">
                            Ver historial completado
                        </Link>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Distribución de ejercicios por grupo muscular.</p>

                    <MuscleStats stats={muscleStats} />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;