import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import WorkoutTimer from '../components/WorkoutTimer';
import RestTimer from '../components/RestTimer';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const WorkoutSession: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const {
        savedRoutines,
        loadRoutines,
        activeWorkout,
        loadActiveWorkout,
        startWorkout,
        updateActiveWorkoutExerciseNotes,
        updateWorkoutExerciseSets,
        finishWorkout,
        cancelWorkout
    } = useStore();

    const [activeRestTimer, setActiveRestTimer] = useState<{ exerciseId: string; setIndex: number; duration: number } | null>(null);
    const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
    const [initializationError, setInitializationError] = useState<string | null>(null);
    const initializingRef = React.useRef(false);

    const setSensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 6 }
        }),
        useSensor(TouchSensor, {
            activationConstraint: { distance: 6 }
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        loadRoutines();
        // Don't auto-load active workout here if we are trying to start a specific one
        // relying on main layout or app init is better, but here we can check:
        loadActiveWorkout();
    }, [loadRoutines, loadActiveWorkout]);

    useEffect(() => {
        const initSession = async () => {
            // Safe guards
            if (activeWorkout) return;
            if (initializingRef.current) return;
            if (savedRoutines.length === 0) return; // Wait for routines to load

            initializingRef.current = true;

            if (id) {
                const routine = savedRoutines.find(r => r.id === id);
                if (routine) {
                    try {
                        console.log('Starting workout for routine:', routine.name);
                        const success = await startWorkout(routine);
                        if (!success) {
                            setInitializationError('No se pudo iniciar el entrenamiento. Verifica tu conexión.');
                        }
                    } catch (e) {
                        setInitializationError('Error al iniciar entrenamiento');
                    }
                } else {
                    // Only redirect if routines are loaded but ID not found
                    if (savedRoutines.length > 0) {
                        console.warn('Routine not found, redirecting');
                        navigate('/routine');
                    }
                }
            }
            initializingRef.current = false;
        };

        initSession();
    }, [id, savedRoutines, activeWorkout, startWorkout, navigate]);

    const toggleSetComplete = (exerciseId: string, setIndex: number) => {
        if (!activeWorkout) return;

        const exercise = activeWorkout.exercises.find(ex => ex.exerciseId === exerciseId);
        if (!exercise) return;

        const updatedSets = exercise.sets.map((set, idx) =>
            idx === setIndex ? { ...set, completed: !set.completed } : set
        );

        updateWorkoutExerciseSets(exerciseId, updatedSets);

        // Start rest timer if completing a set (not uncompleting)
        // Skip rest timer if this set has dropsets (no rest between dropset sub-series)
        const currentSet = exercise.sets[setIndex];
        const hasDropsets = currentSet.dropsets && currentSet.dropsets.length > 0;
        if (!currentSet.completed && currentSet.restSeconds > 0 && !hasDropsets) {
            setActiveRestTimer({
                exerciseId,
                setIndex,
                duration: currentSet.restSeconds
            });
        }
    };

    const updateSetValue = (exerciseId: string, setIndex: number, field: 'reps' | 'weight' | 'restSeconds', value: number) => {
        if (!activeWorkout) return;

        const exercise = activeWorkout.exercises.find(ex => ex.exerciseId === exerciseId);
        if (!exercise) return;

        const updatedSets = exercise.sets.map((set, idx) =>
            idx === setIndex ? { ...set, [field]: value } : set
        );

        updateWorkoutExerciseSets(exerciseId, updatedSets);
    };

    const handleSetDragEnd = (exerciseId: string, event: any) => {
        if (!activeWorkout) return;
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const exercise = activeWorkout.exercises.find(ex => ex.exerciseId === exerciseId);
        if (!exercise) return;

        const oldIndex = exercise.sets.findIndex((set: any) => set.id === active.id);
        const newIndex = exercise.sets.findIndex((set: any) => set.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = arrayMove(exercise.sets, oldIndex, newIndex);
        updateWorkoutExerciseSets(exerciseId, reordered);
    };

    const addSet = (exerciseId: string) => {
        if (!activeWorkout) return;

        const exercise = activeWorkout.exercises.find(ex => ex.exerciseId === exerciseId);
        if (!exercise || exercise.sets.length === 0) return;

        const lastSet = exercise.sets[exercise.sets.length - 1];
        const newSet = {
            reps: lastSet.reps,
            weight: lastSet.weight,
            restSeconds: lastSet.restSeconds,
            completed: false
        };

        updateWorkoutExerciseSets(exerciseId, [...exercise.sets, newSet]);
    };

    const removeSet = (exerciseId: string, setIndex: number) => {
        if (!activeWorkout) return;

        const exercise = activeWorkout.exercises.find(ex => ex.exerciseId === exerciseId);
        if (!exercise || exercise.sets.length <= 1) return;

        const updatedSets = exercise.sets.filter((_, idx) => idx !== setIndex);
        updateWorkoutExerciseSets(exerciseId, updatedSets);
    };

    if (initializationError) {
        return (
            <div className="flex h-full w-full items-center justify-center p-4">
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="size-16 rounded-full bg-red-100 flex items-center justify-center">
                        <span className="material-symbols-outlined text-red-500 text-3xl">error</span>
                    </div>
                    <h2 className="text-xl font-bold">Error</h2>
                    <p className="text-gray-500">{initializationError}</p>
                    <button
                        onClick={() => navigate('/routine')}
                        className="px-6 py-2 bg-primary text-white rounded-lg font-bold"
                    >
                        Volver a Rutinas
                    </button>
                </div>
            </div>
        );
    }

    if (!activeWorkout) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary animate-spin">progress_activity</span>
                    </div>
                    <p className="text-gray-500">Cargando entrenamiento...</p>
                </div>
            </div>
        );
    }

    const totalSets = activeWorkout.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
    const completedSets = activeWorkout.exercises.reduce((acc, ex) =>
        acc + ex.sets.filter(s => s.completed).length, 0
    );
    const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;
    const isPartial = totalSets > 0 && completedSets < totalSets;

    const handleFinish = async () => {
        const confirmed = confirm(
            isPartial
                ? '¿Guardar progreso y finalizar? Se guardará como parcial en tu historial.'
                : '¿Finalizar entrenamiento? Se guardará en tu historial.'
        );
        if (confirmed) {
            // Navigate first to unmount component, then finish
            navigate('/dashboard');
            // Small delay to ensure navigation starts
            setTimeout(() => {
                finishWorkout();
            }, 100);
        }
    };

    return (
        <div className="h-full w-full flex overflow-hidden bg-white dark:bg-background-dark">
            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto mobile-scroll">
                <div className="flex flex-col max-w-3xl mx-auto pb-[calc(9rem+env(safe-area-inset-bottom))]">
                    {/* Header (Mobile Only for Sidebar items) */}
                    <div className="sticky top-0 z-10 bg-white dark:bg-background-dark border-b border-gray-200 dark:border-surface-border p-4 lg:p-6">
                        <div className="flex items-center justify-between mb-3">
                            <Link
                                to="/routine"
                                className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-primary"
                            >
                                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                                Rutinas
                            </Link>

                            {/* Mobile Timer */}
                            <div className="lg:hidden">
                                <WorkoutTimer startedAt={activeWorkout.startedAt} />
                            </div>
                        </div>

                        <h1 className="text-2xl md:text-3xl font-black mb-2">{activeWorkout.routineName}</h1>

                        {/* Mobile Progress Bar */}
                        <div className="lg:hidden flex items-center gap-3">
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                    className="bg-gradient-to-r from-primary to-orange-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <span className="text-sm font-bold text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                {completedSets}/{totalSets}
                            </span>
                        </div>
                    </div>

                    {/* Exercises */}
                    <div className="p-4 lg:p-6 flex flex-col gap-4">
                        {activeWorkout.exercises.map((exercise, exIndex) => (
                            <div
                                key={exercise.exerciseId}
                                className="rounded-2xl bg-white dark:bg-[#1a2632] border border-slate-200 dark:border-[#233648] overflow-hidden shadow-sm"
                            >
                                {/* Exercise Header */}
                                <div
                                    className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1f2d3a] transition-colors"
                                    onClick={() => setExpandedExercise(expandedExercise === exercise.exerciseId ? null : exercise.exerciseId)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                                    #{exIndex + 1}
                                                </span>
                                                <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
                                                    {exercise.primaryMuscle}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-bold">{exercise.name}</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                {exercise.sets.filter(s => s.completed).length}/{exercise.sets.length} series completadas
                                            </p>
                                        </div>
                                        <button className="p-2">
                                            <span className="material-symbols-outlined text-gray-400">
                                                {expandedExercise === exercise.exerciseId ? 'expand_less' : 'expand_more'}
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                {/* Sets (collapsible) */}
                                {expandedExercise === exercise.exerciseId && (
                                    <div className="border-t border-gray-200 dark:border-[#233648] p-4 bg-gray-50 dark:bg-[#0f1820]">
                                        {/* Notes Field */}
                                        <div className="mb-4">
                                            <div className="relative">
                                                <span className="material-symbols-outlined absolute left-3 top-3 text-gray-400 text-[18px]">edit_note</span>
                                                <textarea
                                                    value={exercise.notes || ''}
                                                    onChange={(e) => updateActiveWorkoutExerciseNotes(exercise.exerciseId, e.target.value)}
                                                    placeholder="Notas del ejercicio..."
                                                    rows={2}
                                                    className="w-full bg-white dark:bg-[#1a2632] border border-gray-200 dark:border-[#233648] rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all resize-none"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <DndContext
                                                sensors={setSensors}
                                                collisionDetection={closestCenter}
                                                onDragEnd={(event) => handleSetDragEnd(exercise.exerciseId, event)}
                                            >
                                                <SortableContext
                                                    items={exercise.sets.map((set: any) => set.id)}
                                                    strategy={verticalListSortingStrategy}
                                                >
                                                    {exercise.sets.map((set, setIndex) => (
                                                        <SortableWorkoutSetRow
                                                            key={set.id}
                                                            set={set}
                                                            setIndex={setIndex}
                                                            exerciseId={exercise.exerciseId}
                                                            totalSets={exercise.sets.length}
                                                            toggleSetComplete={toggleSetComplete}
                                                            updateSetValue={updateSetValue}
                                                            removeSet={removeSet}
                                                        />
                                                    ))}
                                                </SortableContext>
                                            </DndContext>

                                            {/* Add Set Button */}
                                            <button
                                                onClick={() => addSet(exercise.exerciseId)}
                                                className="py-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary dark:hover:border-primary text-gray-500 dark:text-gray-400 hover:text-primary font-bold text-sm transition-colors"
                                            >
                                                + Añadir Serie
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Static Footer Container (Mobile Only) */}
                    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-background-dark border-t border-gray-200 dark:border-surface-border z-30 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                        <div className="w-full space-y-3">
                            {/* Timer (if active) - Footer version */}
                            {activeRestTimer && (
                                <div className="mb-4 border-b border-gray-200 dark:border-surface-border pb-4">
                                    <RestTimer
                                        variant="footer"
                                        duration={activeRestTimer.duration}
                                        onComplete={() => setActiveRestTimer(null)}
                                    // No cancel in footer, or maybe just clicking skip/finish cancels it
                                    />
                                </div>
                            )}

                            {/* Finish Button */}
                            <button
                                onClick={handleFinish}
                                className="w-full py-4 rounded-full bg-gradient-to-r from-primary to-orange-600 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all"
                            >
                                {progress === 100 ? '¡Entrenamiento Completo! 🎉' : 'Guardar progreso y salir'}
                            </button>

                            {/* Cancel Button */}
                            <button
                                onClick={async () => {
                                    const confirmed = confirm('¿Cancelar entrenamiento? Se perderá todo el progreso.');
                                    if (confirmed) {
                                        navigate('/dashboard');
                                        setTimeout(() => {
                                            cancelWorkout();
                                        }, 100);
                                    }
                                }}
                                className="w-full py-3 rounded-full border-2 border-red-500 text-red-500 dark:text-red-400 font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                            >
                                Cancelar Entrenamiento
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sidebar (Desktop) */}
            <aside className="hidden lg:flex flex-col w-[360px] bg-white dark:bg-background-dark border-l border-gray-200 dark:border-surface-border h-full shrink-0 shadow-2xl z-20">
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                    {/* Timer Widget */}
                    <div className="bg-gray-50 dark:bg-surface-dark rounded-2xl p-6 border border-gray-100 dark:border-surface-border shadow-sm">
                        <h3 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase mb-2 text-center">Tiempo Transcurrido</h3>
                        <div className="flex justify-center">
                            <WorkoutTimer startedAt={activeWorkout.startedAt} className="text-4xl" />
                        </div>
                    </div>

                    {/* Progress Widget */}
                    <div className="bg-gray-50 dark:bg-surface-dark rounded-2xl p-6 border border-gray-100 dark:border-surface-border shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase">Progreso</h3>
                            <span className="text-sm font-bold text-primary dark:text-white">{Math.round(progress)}%</span>
                        </div>
                        <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
                            <div
                                className="bg-gradient-to-r from-primary to-orange-600 h-3 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                            {completedSets} de {totalSets} series completadas
                        </p>
                    </div>

                    {/* Active Rest Timer Widget */}
                    {activeRestTimer && (
                        <div className="bg-primary/5 dark:bg-primary/10 rounded-2xl p-6 border border-primary/20 shadow-sm">
                            <RestTimer
                                variant="inline"
                                duration={activeRestTimer.duration}
                                onComplete={() => setActiveRestTimer(null)}
                            />
                        </div>
                    )}

                    <div className="mt-auto space-y-3">
                        <button
                            onClick={handleFinish}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-orange-600 text-white font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined">flag</span>
                            {progress === 100 ? 'Finalizar' : 'Guardar progreso'}
                        </button>

                        <button
                            onClick={async () => {
                                const confirmed = confirm('¿Cancelar entrenamiento? Se perderá todo el progreso.');
                                if (confirmed) {
                                    navigate('/dashboard');
                                    setTimeout(() => {
                                        cancelWorkout();
                                    }, 100);
                                }
                            }}
                            className="w-full py-3 rounded-xl border-2 border-red-100 dark:border-red-900/30 text-red-500 dark:text-red-400 font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined">close</span>
                            Cancelar
                        </button>
                    </div>
                </div>
            </aside>
        </div>
    );
};

const SortableWorkoutSetRow: React.FC<{
    set: any;
    setIndex: number;
    exerciseId: string;
    totalSets: number;
    toggleSetComplete: (exerciseId: string, setIndex: number) => void;
    updateSetValue: (exerciseId: string, setIndex: number, field: 'reps' | 'weight' | 'restSeconds', value: number) => void;
    removeSet: (exerciseId: string, setIndex: number) => void;
}> = ({ set, setIndex, exerciseId, totalSets, toggleSetComplete, updateSetValue, removeSet }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: set.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
        zIndex: isDragging ? 5 : 'auto',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`p-3 rounded-lg border-2 transition-all ${set.completed
                ? 'bg-primary/10 border-primary'
                : set.isWarmup
                    ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-gray-200 dark:border-[#233648] opacity-75'
                    : 'bg-white dark:bg-[#1a2632] border-gray-200 dark:border-[#233648]'
                }`}
        >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
                <div className="flex items-center gap-2">
                    <button
                        {...attributes}
                        {...listeners}
                        className="cursor-grab touch-none active:cursor-grabbing text-gray-400 hover:text-primary flex items-center justify-center"
                        title="Arrastrar serie"
                        aria-label="Arrastrar serie"
                    >
                        <span className="material-symbols-outlined text-[18px]">drag_indicator</span>
                    </button>
                    {/* Checkbox */}
                    <button
                        onClick={() => toggleSetComplete(exerciseId, setIndex)}
                        className={`size-8 rounded-full border-2 flex items-center justify-center transition-all ${set.completed
                            ? 'bg-primary border-primary'
                            : 'border-gray-300 dark:border-gray-600'
                            }`}
                    >
                        {set.completed && (
                            <span className="material-symbols-outlined text-white text-[18px]">check</span>
                        )}
                    </button>

                    <span className="text-sm font-bold text-gray-600 dark:text-gray-400 w-16 shrink-0">
                        Serie {setIndex + 1}
                    </span>

                    {/* Dropset/Warmup badge */}
                    {set.dropsets && set.dropsets.length > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500 text-white" title={`Dropset con ${set.dropsets.length} sub-series`}>
                            D+{set.dropsets.length}
                        </span>
                    )}
                    {set.isWarmup && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500 text-white" title="Calentamiento">W</span>
                    )}
                </div>

                <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-2 sm:flex-1">
                    {/* Weight */}
                    <div className="flex items-center gap-1">
                        <input
                            type="text"
                            inputMode="decimal"
                            value={set.weight || ''}
                            onChange={(e) => {
                                const val = e.target.value.replace(',', '.');
                                updateSetValue(exerciseId, setIndex, 'weight', val === '' ? 0 : parseFloat(val) || 0);
                            }}
                            className="w-full min-w-[60px] sm:w-16 px-2 py-1 text-center rounded bg-white dark:bg-[#1a2632] border border-gray-200 dark:border-[#233648] text-sm font-bold"
                        />
                        <span className="text-xs text-gray-500">kg</span>
                    </div>

                    {/* Reps */}
                    <div className="flex items-center gap-1">
                        <input
                            type="text"
                            inputMode="numeric"
                            value={set.reps ? String(set.reps) : ''}
                            onChange={(e) => {
                                const raw = e.target.value;
                                if (!/^[0-9]*$/.test(raw)) return;
                                updateSetValue(exerciseId, setIndex, 'reps', raw === '' ? 0 : parseInt(raw, 10));
                            }}
                            className="w-full min-w-[52px] sm:w-14 px-2 py-1 text-center rounded bg-white dark:bg-[#1a2632] border border-gray-200 dark:border-[#233648] text-sm font-bold"
                        />
                        <span className="text-xs text-gray-500">reps</span>
                    </div>

                    {/* Rest */}
                    <div className="flex items-center gap-1">
                        <input
                            type="number"
                            value={set.restSeconds}
                            onChange={(e) => updateSetValue(exerciseId, setIndex, 'restSeconds', parseInt(e.target.value) || 0)}
                            className="w-full min-w-[52px] sm:w-14 px-2 py-1 text-center rounded bg-white dark:bg-[#1a2632] border border-gray-200 dark:border-[#233648] text-sm font-bold"
                        />
                        <span className="text-xs text-gray-500">seg</span>
                    </div>
                </div>

                {/* Delete Set */}
                {totalSets > 1 && (
                    <button
                        onClick={() => removeSet(exerciseId, setIndex)}
                        className="self-start sm:self-center sm:ml-auto p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                        <span className="material-symbols-outlined text-red-500 text-[18px]">close</span>
                    </button>
                )}
            </div>

            {/* Dropset sub-series */}
            {set.dropsets && set.dropsets.length > 0 && (
                <div className="ml-6 mt-1 space-y-1">
                    {set.dropsets.map((dropset: any, dIndex: number) => (
                        <div
                            key={`${setIndex}-${dIndex}`}
                            className="flex items-center gap-2 p-2 pl-4 rounded-lg bg-orange-50/50 dark:bg-orange-900/10 border-l-2 border-orange-400"
                        >
                            <span className="text-xs font-bold text-orange-600 dark:text-orange-400 w-8">
                                {setIndex + 1}.{dIndex + 1}
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500 text-white">D</span>
                            <div className="flex items-center gap-1">
                                <input
                                    type="number"
                                    value={dropset.weight}
                                    readOnly
                                    className="w-12 px-2 py-1 text-center rounded bg-white dark:bg-[#1a2632] border border-orange-200 dark:border-orange-700 text-sm font-bold"
                                />
                                <span className="text-xs text-gray-500">kg</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <input
                                    type="number"
                                    value={dropset.reps}
                                    readOnly
                                    className="w-12 px-2 py-1 text-center rounded bg-white dark:bg-[#1a2632] border border-orange-200 dark:border-orange-700 text-sm font-bold"
                                />
                                <span className="text-xs text-gray-500">reps</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default WorkoutSession;
