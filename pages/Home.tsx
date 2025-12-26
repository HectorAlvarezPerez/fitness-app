import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';

const Home: React.FC = () => {
    const { userData, activeWorkout, workoutHistory, loadUserData, loadWorkoutHistory, loadActiveWorkout } = useStore();
    const [greeting, setGreeting] = useState('Hola');

    useEffect(() => {
        loadUserData();
        loadWorkoutHistory();
        loadActiveWorkout();

        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Buenos días');
        else if (hour < 20) setGreeting('Buenas tardes');
        else setGreeting('Buenas noches');
    }, [loadUserData, loadWorkoutHistory, loadActiveWorkout]);

    const lastWorkout = workoutHistory && workoutHistory.length > 0 ? workoutHistory[0] : null;
    const displayName = userData?.user_metadata?.full_name || userData?.email?.split('@')[0] || 'Atleta';

    return (
        <div className="h-full w-full overflow-y-auto p-4 md:p-8">
            <div className="flex flex-col max-w-4xl mx-auto flex-1 gap-6 pb-20">
                <header className="flex flex-col gap-2">
                    <h1 className="text-3xl md:text-4xl font-black">{greeting}, <span className="text-primary capitalize">{displayName}</span></h1>
                    <p className="text-gray-500 dark:text-gray-400">¿Qué te gustaría entrenar hoy?</p>
                </header>

                {/* Active Workout Card */}
                {activeWorkout && (
                    <div className="p-1 rounded-2xl bg-gradient-to-br from-primary to-orange-600">
                        <div className="bg-white dark:bg-[#1a2632] rounded-xl p-5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-10">
                                <span className="material-symbols-outlined text-[100px] text-primary">fitness_center</span>
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-lg font-bold text-primary mb-1">Entrenamiento en Curso</h3>
                                <p className="text-xl font-bold mb-4">{activeWorkout.routineName}</p>
                                <Link
                                    to={`/routine/${activeWorkout.routineId}/workout`}
                                    className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-full font-bold shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all"
                                >
                                    <span>Continuar Entrenando</span>
                                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                {/* Quick Actions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Link to="/routine" className="group relative overflow-hidden rounded-2xl bg-white dark:bg-[#1a2632] border border-slate-200 dark:border-[#233648] p-6 hover:border-primary/50 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-xl text-blue-600 dark:text-blue-400">
                                <span className="material-symbols-outlined">fitness_center</span>
                            </div>
                            <span className="material-symbols-outlined text-gray-300 group-hover:text-primary transition-colors">chevron_right</span>
                        </div>
                        <h3 className="text-lg font-bold mb-1">Mis Rutinas</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Inicia una nueva sesión desde tus planes.</p>
                    </Link>

                    <Link to="/history" className="group relative overflow-hidden rounded-2xl bg-white dark:bg-[#1a2632] border border-slate-200 dark:border-[#233648] p-6 hover:border-primary/50 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                            <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-xl text-purple-600 dark:text-purple-400">
                                <span className="material-symbols-outlined">history</span>
                            </div>
                            <span className="material-symbols-outlined text-gray-300 group-hover:text-primary transition-colors">chevron_right</span>
                        </div>
                        <h3 className="text-lg font-bold mb-1">Historial</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Revisa tus entrenamientos pasados.</p>
                    </Link>
                </div>

                {/* Last Workout Summary */}
                {lastWorkout && (
                    <div className="rounded-2xl bg-white dark:bg-[#1a2632] border border-slate-200 dark:border-[#233648] p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">Último Entrenamiento</h3>
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                {new Date(lastWorkout.completed_at).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                            </span>
                        </div>

                        <div className="flex items-center gap-4 mb-4">
                            <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full text-green-600 dark:text-green-400">
                                <span className="material-symbols-outlined">check_circle</span>
                            </div>
                            <div>
                                <p className="font-bold text-xl">{lastWorkout.routine_name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {lastWorkout.total_volume ? `${(lastWorkout.total_volume / 1000).toFixed(1)}k kg` : '0 kg'} • {lastWorkout.duration_minutes || 0} min
                                </p>
                            </div>
                        </div>

                        <Link
                            to="/history"
                            className="block w-full text-center py-2 text-sm font-bold text-primary hover:bg-primary/5 rounded-lg transition-colors"
                        >
                            Ver Detalles
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;
