import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';

const RoutinesList: React.FC = () => {
    const { savedRoutines, loadRoutines, deleteRoutine } = useStore();

    useEffect(() => {
        loadRoutines();
    }, [loadRoutines]);

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`¿Eliminar la rutina "${name}"?`)) {
            await deleteRoutine(id);
        }
    };

    return (
        <div className="h-full w-full overflow-y-auto p-4 md:p-8">
            <div className="flex flex-col max-w-6xl mx-auto gap-6 pb-20">
                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black">Mis Rutinas</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Gestiona y ejecuta tus entrenamientos
                        </p>
                    </div>
                    <Link
                        to="/routine/new"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-white font-bold hover:bg-primary/90 transition-all shadow-lg"
                    >
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        <span className="hidden sm:inline">Nueva Rutina</span>
                    </Link>
                </header>

                {savedRoutines.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="size-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-4xl text-gray-400">
                                fitness_center
                            </span>
                        </div>
                        <h3 className="text-xl font-bold mb-2">No tienes rutinas aún</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">
                            Crea tu primera rutina para empezar a entrenar
                        </p>
                        <Link
                            to="/routine/new"
                            className="px-6 py-3 rounded-full bg-primary text-white font-bold hover:bg-primary/90 transition-all"
                        >
                            Crear Primera Rutina
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {savedRoutines.map((routine) => (
                            <div
                                key={routine.id}
                                className="group relative rounded-2xl border border-slate-200 dark:border-[#233648] bg-white dark:bg-[#1a2632] p-5 hover:border-primary/50 transition-all"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="text-lg font-bold pr-8">{routine.name}</h3>
                                    <div className="flex gap-1">
                                        <Link
                                            to={`/routine/edit/${routine.id}`}
                                            className="size-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                            title="Editar"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">edit</span>
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(routine.id, routine.name)}
                                            className="size-8 rounded-lg flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"
                                            title="Eliminar"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-4">
                                    <div className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[16px]">
                                            fitness_center
                                        </span>
                                        <span>{routine.exercises.length} ejercicios</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[16px]">
                                            schedule
                                        </span>
                                        <span>
                                            {new Date(routine.updated_at).toLocaleDateString('es-ES', {
                                                day: 'numeric',
                                                month: 'short',
                                            })}
                                        </span>
                                    </div>
                                </div>

                                <Link
                                    to={`/routine/${routine.id}/workout`}
                                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-primary/10 text-primary font-bold hover:bg-primary hover:text-white transition-all"
                                >
                                    <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                                    Iniciar Entrenamiento
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoutinesList;
