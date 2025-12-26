import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';

const WorkoutHistory: React.FC = () => {
    const { workoutHistory, loadWorkoutHistory, savedRoutines, loadRoutines, deleteWorkoutSession, deleteWorkoutSessions } = useStore();
    const [expandedWorkouts, setExpandedWorkouts] = useState<Set<string>>(new Set());
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    useEffect(() => {
        loadWorkoutHistory();
        loadRoutines();
    }, [loadWorkoutHistory, loadRoutines]);

    const toggleWorkout = (id: string) => {
        if (isSelectionMode) {
            handleSelect(id);
            return;
        }
        setExpandedWorkouts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleSelect = (id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const toggleSelectionMode = () => {
        setIsSelectionMode(!isSelectionMode);
        setSelectedIds(new Set());
    };

    const handleBulkDelete = () => {
        if (selectedIds.size === 0) return;

        const confirmed = confirm(`¿Estás seguro de que deseas eliminar ${selectedIds.size} entrenamiento(s)?`);
        if (confirmed) {
            deleteWorkoutSessions(Array.from(selectedIds));
            setSelectedIds(new Set());
            setIsSelectionMode(false);
        }
    };

    const formatDuration = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Hoy';
        if (diffDays === 1) return 'Ayer';
        if (diffDays < 7) return `Hace ${diffDays} días`;

        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    };

    const formatFullDateTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Helper to get current routine name or fallback to saved name
    const getRoutineName = (workout: any) => {
        if (workout.routine_id) {
            const currentRoutine = savedRoutines.find(r => r.id === workout.routine_id);
            if (currentRoutine) {
                return currentRoutine.name;
            }
        }
        return workout.routine_name; // Fallback to saved name if routine doesn't exist
    };

    return (
        <div className="h-full w-full overflow-y-auto p-4 md:p-8">
            <div className="flex flex-col max-w-4xl mx-auto gap-6 pb-20">
                {/* Header */}
                <header className="flex items-center justify-between sticky top-0 bg-background-light dark:bg-background-dark z-10 py-2">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black">Historial</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            {workoutHistory.length} entrenamientos completados
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {isSelectionMode ? (
                            <>
                                <button
                                    onClick={handleBulkDelete}
                                    disabled={selectedIds.size === 0}
                                    className="px-4 py-2 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-full font-bold text-sm hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
                                >
                                    Eliminar ({selectedIds.size})
                                </button>
                                <button
                                    onClick={toggleSelectionMode}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300 rounded-full font-bold text-sm hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={toggleSelectionMode}
                                className="px-4 py-2 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 rounded-full font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                                Seleccionar
                            </button>
                        )}
                    </div>
                </header>

                {/* Workout List */}
                {workoutHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="size-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-4xl text-gray-400">
                                history
                            </span>
                        </div>
                        <h3 className="text-xl font-bold mb-2">Sin entrenamientos aún</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">
                            Completa tu primer entrenamiento para verlo aquí
                        </p>
                        <Link
                            to="/routine"
                            className="px-6 py-3 rounded-full bg-primary text-white font-bold hover:bg-primary/90 transition-all"
                        >
                            Ir a Rutinas
                        </Link>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {workoutHistory.map((workout) => {
                            const exerciseCount = Array.isArray(workout.exercises_completed)
                                ? workout.exercises_completed.length
                                : 0;
                            const isExpanded = expandedWorkouts.has(workout.id);
                            const isSelected = selectedIds.has(workout.id);

                            return (
                                <div
                                    key={workout.id}
                                    className={`rounded-2xl border bg-white dark:bg-[#1a2632] overflow-hidden transition-all relative ${isSelected
                                            ? 'border-primary ring-1 ring-primary bg-primary/5 dark:bg-primary/10'
                                            : 'border-slate-200 dark:border-[#233648] hover:border-primary/50'
                                        }`}
                                >
                                    {/* Selection Checkbox Overlay */}
                                    {isSelectionMode && (
                                        <div className="absolute top-5 right-5 z-20 pointer-events-none">
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected
                                                    ? 'bg-primary border-primary'
                                                    : 'border-gray-300 dark:border-gray-500 bg-white/50 dark:bg-black/50'
                                                }`}>
                                                {isSelected && (
                                                    <span className="material-symbols-outlined text-white text-[16px]">check</span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Summary Section - Always Visible */}
                                    <div
                                        className="p-5 cursor-pointer relative"
                                        onClick={() => toggleWorkout(workout.id)}
                                    >
                                        <div className="flex items-start justify-between mb-3 pr-8">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-bold">
                                                        COMPLETADO
                                                    </span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {formatDate(workout.completed_at)}
                                                    </span>
                                                </div>
                                                <h3 className="text-lg font-bold">{getRoutineName(workout)}</h3>
                                            </div>

                                            {/* Standard Actions (only when NOT in selection mode) */}
                                            {!isSelectionMode && (
                                                <div className="flex items-center gap-2 absolute top-5 right-5">
                                                    {/* Delete Button */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // Prevent toggle when clicking delete
                                                            const confirmed = confirm('¿Eliminar este entrenamiento del historial?');
                                                            if (confirmed) {
                                                                deleteWorkoutSession(workout.id);
                                                            }
                                                        }}
                                                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors group"
                                                    >
                                                        <span className="material-symbols-outlined text-gray-400 group-hover:text-red-500 text-[20px]">
                                                            delete
                                                        </span>
                                                    </button>
                                                    {/* Expand Button */}
                                                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                                        <span className={`material-symbols-outlined text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                                            expand_more
                                                        </span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Stats Grid */}
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0f1820]">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="material-symbols-outlined text-primary text-[16px]">
                                                        timer
                                                    </span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        Duración
                                                    </span>
                                                </div>
                                                <p className="font-bold">{formatDuration(workout.duration_minutes)}</p>
                                            </div>

                                            <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0f1820]">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="material-symbols-outlined text-primary text-[16px]">
                                                        fitness_center
                                                    </span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        Ejercicios
                                                    </span>
                                                </div>
                                                <p className="font-bold">{exerciseCount}</p>
                                            </div>

                                            <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#0f1820]">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="material-symbols-outlined text-primary text-[16px]">
                                                        scale
                                                    </span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        Volumen
                                                    </span>
                                                </div>
                                                <p className="font-bold">
                                                    {(workout.total_volume / 1000).toFixed(1)}k kg
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && !isSelectionMode && (
                                        <div className="border-t border-slate-200 dark:border-[#233648] bg-gray-50 dark:bg-[#0f1820] p-5">
                                            {/* Date/Time Info */}
                                            <div className="mb-4 pb-4 border-b border-slate-200 dark:border-[#233648]">
                                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                    <span className="material-symbols-outlined text-[18px]">
                                                        calendar_today
                                                    </span>
                                                    <span className="capitalize">{formatFullDateTime(workout.completed_at)}</span>
                                                </div>
                                            </div>

                                            {/* Exercise List */}
                                            <div className="space-y-4">
                                                <h4 className="font-bold text-sm uppercase text-gray-500 dark:text-gray-400 mb-3">
                                                    Ejercicios realizados
                                                </h4>
                                                {Array.isArray(workout.exercises_completed) && workout.exercises_completed.map((exercise: any, idx: number) => (
                                                    <div
                                                        key={idx}
                                                        className="bg-white dark:bg-[#1a2632] rounded-xl p-4 border border-slate-200 dark:border-[#233648]"
                                                    >
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <span className="material-symbols-outlined text-primary">
                                                                fitness_center
                                                            </span>
                                                            <h5 className="font-bold">{exercise.name}</h5>
                                                        </div>

                                                        {/* Sets Table */}
                                                        <div className="space-y-2">
                                                            {Array.isArray(exercise.sets) && exercise.sets.map((set: any, setIdx: number) => (
                                                                <div
                                                                    key={setIdx}
                                                                    className="flex items-center gap-3 text-sm p-2 rounded-lg bg-gray-50 dark:bg-[#0f1820]"
                                                                >
                                                                    <span className="font-bold text-gray-500 dark:text-gray-400 w-16">
                                                                        Serie {setIdx + 1}
                                                                    </span>
                                                                    <div className="flex items-center gap-4 flex-1">
                                                                        <div className="flex items-center gap-1">
                                                                            <span className="font-bold text-primary">{set.weight}</span>
                                                                            <span className="text-xs text-gray-500">kg</span>
                                                                        </div>
                                                                        <span className="text-gray-400">×</span>
                                                                        <div className="flex items-center gap-1">
                                                                            <span className="font-bold text-primary">{set.reps}</span>
                                                                            <span className="text-xs text-gray-500">reps</span>
                                                                        </div>
                                                                    </div>
                                                                    {set.completed && (
                                                                        <span className="material-symbols-outlined text-green-500 text-[18px]">
                                                                            check_circle
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WorkoutHistory;
