import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import ExerciseLibrarySheet from '../components/ExerciseLibrarySheet';
import { createId } from '../lib/id';
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
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const RoutineEditor: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [defaultRestSeconds, setDefaultRestSeconds] = useState<number>(90);
    const {
        routineName,
        setRoutineName,
        exercises,
        addExercise,
        updateExercise,
        removeExercise,
        setExercises,
        savedRoutines,
        saveRoutine,
        // Exercise Library
        exerciseLibrary,
        loadExerciseLibrary,
        selectedMuscleFilter,
        selectedEquipmentFilter,
        exerciseSearchQuery,
        setMuscleFilter,
        setEquipmentFilter,
        setExerciseSearchQuery,
        getFilteredExercises,
        userData
    } = useStore();

    // Load routine if editing
    useEffect(() => {
        if (id) {
            const routine = savedRoutines.find(r => r.id === id);
            if (routine) {
                setRoutineName(routine.name);
                setExercises(routine.exercises);
                setDefaultRestSeconds(routine.default_rest_seconds || 90);
            }
        } else {
            // Reset for new routine
            setRoutineName('Nueva Rutina');
            setExercises([]);
            setDefaultRestSeconds(userData?.default_rest_seconds || 90);
        }
    }, [id, savedRoutines, setRoutineName, setExercises, userData?.default_rest_seconds]);

    // Load exercise library
    useEffect(() => {
        loadExerciseLibrary();
    }, [loadExerciseLibrary]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 }
        }),
        useSensor(TouchSensor, {
            activationConstraint: { distance: 8 }
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function handleDragEnd(event: any) {
        const { active, over } = event;

        if (!over) return;

        if (active.id !== over.id) {
            const oldIndex = exercises.findIndex(e => e.id === active.id);
            const newIndex = exercises.findIndex(e => e.id === over.id);
            setExercises(arrayMove(exercises, oldIndex, newIndex));
        }
    }

    const handleAddFromLibrary = (exerciseLibItem: any) => {
        const defaultSets = userData?.default_sets_count || 3;
        const defaultReps = userData?.default_reps_count || 10;
        const defaultWeight = userData?.default_weight_kg || 20;

        const newSets = Array.from({ length: defaultSets }, () => ({
            reps: defaultReps,
            weight: defaultWeight
        }));

        addExercise({
            id: Date.now().toString(),
            name: exerciseLibItem.name,
            muscleGroup: exerciseLibItem.primary_muscle,
            sets: newSets
        });
    };

    const filteredLibrary = getFilteredExercises();

    const muscleGroups = ['Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Cuádriceps', 'Isquiotibiales', 'Glúteos', 'Gemelos', 'Core', 'Cardio', 'Full Body'];
    const equipmentTypes = ['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight', 'Kettlebell', 'Other'];

    const handleSave = async () => {
        console.log('handleSave called', { routineName, exercises, id, defaultRestSeconds });

        if (!routineName.trim()) {
            alert('Por favor, ingresa un nombre para la rutina');
            return;
        }

        if (exercises.length === 0) {
            alert('Agrega al menos un ejercicio a la rutina');
            return;
        }

        console.log('Calling saveRoutine...');
        const { data, error } = await saveRoutine(routineName, exercises, id, undefined, defaultRestSeconds);
        console.log('saveRoutine result:', { data, error });

        if (error) {
            alert(error);
        } else if (data) {
            navigate('/routine');
        }
    };

    return (
        <>
            <div className="h-full w-full flex overflow-hidden bg-slate-100 dark:bg-[#0a1218]">
                <div className="flex-1 overflow-y-auto mobile-scroll">
                    <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 pb-[calc(8rem+env(safe-area-inset-bottom))] flex flex-col gap-6">
                        {/* Header with back and save buttons */}
                        <div className="flex items-center justify-between gap-3">
                            <button
                                onClick={() => navigate('/routine')}
                                className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-primary transition-colors py-2"
                            >
                                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                                <span className="font-medium hidden sm:inline">Volver</span>
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-5 py-2.5 bg-primary text-white rounded-full font-bold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
                            >
                                <span className="material-symbols-outlined text-[18px]">save</span>
                                <span>Guardar</span>
                            </button>
                        </div>

                        {/* Routine Name Input */}
                        <div className="mb-2">
                            <input
                                type="text"
                                value={routineName}
                                onChange={(e) => setRoutineName(e.target.value)}
                                placeholder="Nombre de la rutina"
                                className="w-full text-2xl md:text-3xl font-black bg-transparent border-b-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-primary dark:focus:border-primary outline-none transition-colors px-1 py-1 text-gray-900 dark:text-white"
                            />
                        </div>

                        {/* Stats cards */}
                        <div className="grid grid-cols-3 gap-3 p-1 bg-white dark:bg-surface-dark/50 border border-gray-100 dark:border-surface-border rounded-2xl">
                            <div className="bg-gray-50 dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-surface-border/50 p-3 px-4 flex items-center justify-between">
                                <div className="flex flex-col"><span className="text-[10px] font-bold uppercase text-gray-500 dark:text-text-muted">Ejercicios</span><span className="text-xl font-bold text-slate-900 dark:text-white">{exercises.length}</span></div>
                            </div>
                            <div className="bg-gray-50 dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-surface-border/50 p-3 px-4 flex items-center justify-between">
                                <div className="flex flex-col"><span className="text-[10px] font-bold uppercase text-gray-500 dark:text-text-muted">Volumen Est.</span><span className="text-xl font-bold text-primary dark:text-progress-teal">
                                    {(exercises.reduce((acc, curr) => {
                                        // Handle both array and legacy number format for sets
                                        if (Array.isArray(curr.sets)) {
                                            return acc + curr.sets.reduce((sAcc, s) => sAcc + (s.weight * s.reps), 0);
                                        } else {
                                            // Legacy fallback
                                            return acc + (curr.weight! * curr.reps! * (curr.sets as unknown as number));
                                        }
                                    }, 0) / 1000).toFixed(1)}k
                                </span></div>
                            </div>
                            <div className="bg-gray-50 dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-surface-border/50 p-3 px-4 flex items-center justify-between">
                                <div className="flex flex-col w-full">
                                    <span className="text-[10px] font-bold uppercase text-gray-500 dark:text-text-muted">Descanso</span>
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="number"
                                            value={defaultRestSeconds}
                                            onChange={(e) => setDefaultRestSeconds(parseInt(e.target.value) || 60)}
                                            className="w-14 text-xl font-bold text-slate-900 dark:text-white bg-transparent border-none outline-none p-0"
                                            min={0}
                                            max={600}
                                        />
                                        <span className="text-xs text-gray-500">seg</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Exercise list */}
                        <div className="flex flex-col gap-4">
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={exercises.map(e => e.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {exercises.map((exercise) => (
                                        <SortableExerciseItem
                                            key={exercise.id}
                                            exercise={exercise}
                                            updateExercise={updateExercise}
                                            removeExercise={removeExercise}
                                        />
                                    ))}
                                </SortableContext>
                            </DndContext>

                            {exercises.length === 0 && (
                                <div
                                    onClick={() => setIsLibraryOpen(true)}
                                    className="h-40 rounded-2xl border-2 border-dashed border-gray-200 dark:border-surface-border flex flex-col gap-3 items-center justify-center bg-gray-50 dark:bg-surface-dark/10 text-gray-400 dark:text-text-muted cursor-pointer hover:border-primary/50 hover:text-primary/70 transition-all active:scale-[0.99]"
                                >
                                    <span className="material-symbols-outlined text-3xl">add_circle</span>
                                    <p className="font-medium text-sm">Toca aquí para añadir ejercicios</p>
                                </div>
                            )}

                            {exercises.length > 0 && (
                                <div className="h-20 rounded-2xl border-2 border-dashed border-gray-200 dark:border-surface-border flex flex-col gap-2 items-center justify-center bg-gray-50 dark:bg-surface-dark/10 text-gray-400 dark:text-text-muted">
                                    <span className="material-symbols-outlined text-xl">swap_vert</span>
                                    <p className="font-medium text-xs">Arrastra para reordenar</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Exercise Library Sidebar - Desktop only */}
                <aside className="w-[360px] hidden lg:flex flex-col border-l border-gray-200 dark:border-surface-border bg-white dark:bg-background-dark h-full shrink-0 shadow-2xl z-10">
                    <div className="px-6 pt-8 pb-4">
                        <h3 className="text-slate-900 dark:text-white text-xl font-bold mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">library_books</span>
                            Biblioteca
                        </h3>

                        {/* Search */}
                        <div className="relative group mb-3">
                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-text-muted group-focus-within:text-primary transition-colors">search</span>
                            <input
                                value={exerciseSearchQuery}
                                onChange={(e) => setExerciseSearchQuery(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-surface-dark border border-gray-200 dark:border-surface-border rounded-xl py-3 pl-11 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-gray-400 dark:placeholder:text-text-muted/70 transition-all"
                                placeholder="Buscar ejercicio..."
                                type="text"
                            />
                        </div>

                        {/* Muscle Filter */}
                        <select
                            className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-surface-dark border border-gray-200 dark:border-surface-border text-sm mb-2 focus:outline-none focus:border-primary"
                            value={selectedMuscleFilter || ''}
                            onChange={(e) => setMuscleFilter(e.target.value || null)}
                        >
                            <option value="">Todos los músculos</option>
                            {muscleGroups.map(muscle => (
                                <option key={muscle} value={muscle}>{muscle}</option>
                            ))}
                        </select>

                        {/* Equipment Filter */}
                        <select
                            className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-surface-dark border border-gray-200 dark:border-surface-border text-sm focus:outline-none focus:border-primary"
                            value={selectedEquipmentFilter || ''}
                            onChange={(e) => setEquipmentFilter(e.target.value || null)}
                        >
                            <option value="">Todo el equipamiento</option>
                            {equipmentTypes.map(eq => (
                                <option key={eq} value={eq}>{eq}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 px-6 flex flex-col gap-3">
                        {filteredLibrary.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No se encontraron ejercicios</p>
                        ) : (
                            filteredLibrary.map((ex) => (
                                <div key={ex.id} className="group flex items-center gap-3 p-2 pr-3 rounded-xl bg-gray-50 dark:bg-surface-dark/40 hover:bg-white dark:hover:bg-surface-dark border border-transparent hover:border-gray-200 dark:hover:border-surface-border cursor-pointer transition-all shadow-sm hover:shadow">
                                    <div className="size-12 rounded-lg bg-gray-200 dark:bg-gray-700 shrink-0 border border-gray-200 dark:border-surface-border flex items-center justify-center">
                                        <span className="text-xs text-slate-500 dark:text-white/40">{ex.name[0]}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-slate-900 dark:text-white text-sm font-bold truncate group-hover:text-primary transition-colors">{ex.name}</h4>
                                        <p className="text-[10px] text-gray-500 dark:text-text-muted truncate mt-0.5">{ex.primary_muscle} • {ex.equipment}</p>
                                    </div>
                                    <button
                                        onClick={() => handleAddFromLibrary(ex)}
                                        className="size-8 rounded-full bg-white dark:bg-background-dark border border-gray-200 dark:border-surface-border flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">add</span>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </aside>
            </div>

            {/* Mobile FAB - Add Exercise */}
            <button
                onClick={() => setIsLibraryOpen(true)}
                className="lg:hidden fixed bottom-24 right-4 z-40 size-14 rounded-full bg-gradient-to-br from-primary to-orange-600 text-white shadow-xl shadow-primary/30 flex items-center justify-center active:scale-95 transition-transform"
            >
                <span className="material-symbols-outlined text-[28px]">add</span>
            </button>

            {/* Mobile Exercise Library Sheet */}
            <ExerciseLibrarySheet
                isOpen={isLibraryOpen}
                onClose={() => setIsLibraryOpen(false)}
                onAddExercise={handleAddFromLibrary}
            />
        </>
    );
};

// Sortable Exercise Item Component
function SortableExerciseItem({ exercise, updateExercise, removeExercise }: any) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: exercise.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    // Ensure sets are arrays with stable IDs (backward compatibility)
    useEffect(() => {
        if (Array.isArray(exercise.sets)) {
            const missingId = exercise.sets.some((set: any) => !set.id);
            if (missingId) {
                const updated = exercise.sets.map((set: any) => set.id ? set : { ...set, id: createId('set') });
                updateExercise(exercise.id, { sets: updated });
            }
            return;
        }

        if (typeof exercise.sets === 'number') {
            const baseSets = Array.from({ length: exercise.sets }, () => ({
                id: createId('set'),
                reps: exercise.reps || 10,
                weight: exercise.weight || 20
            }));
            updateExercise(exercise.id, { sets: baseSets });
        }
    }, [exercise.id, exercise.reps, exercise.sets, exercise.weight, updateExercise]);

    const sets = Array.isArray(exercise.sets) ? exercise.sets : [];

    const [weightDrafts, setWeightDrafts] = useState<Record<string, string>>({});
    const [activeWeightId, setActiveWeightId] = useState<string | null>(null);

    useEffect(() => {
        setWeightDrafts((prev) => {
            const next: Record<string, string> = {};
            sets.forEach((set: any) => {
                if (!set.id) return;
                if (activeWeightId === set.id && prev[set.id] !== undefined) {
                    next[set.id] = prev[set.id];
                    return;
                }
                next[set.id] = set.weight ? String(set.weight) : '';
            });
            return next;
        });
    }, [sets, activeWeightId]);

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

    const handleSetDragEnd = (event: any) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = sets.findIndex((set: any) => set.id === active.id);
        const newIndex = sets.findIndex((set: any) => set.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;
        updateExercise(exercise.id, { sets: arrayMove(sets, oldIndex, newIndex) });
    };

    const updateSet = (index: number, field: 'reps' | 'weight', value: number) => {
        const newSets = [...sets];
        newSets[index] = { ...newSets[index], [field]: value };
        updateExercise(exercise.id, { sets: newSets });
    };

    const toggleWarmup = (index: number) => {
        const newSets = [...sets];
        newSets[index] = { ...newSets[index], isWarmup: !newSets[index].isWarmup };
        updateExercise(exercise.id, { sets: newSets });
    };

    const addDropsetSubSerie = (index: number) => {
        const newSets = [...sets];
        const currentSet = newSets[index];
        const lastDropset = currentSet.dropsets?.[currentSet.dropsets.length - 1];
        const newDropset = lastDropset
            ? { reps: lastDropset.reps, weight: Math.max(0, lastDropset.weight - 5) } // Reduce weight for next dropset
            : { reps: currentSet.reps, weight: Math.max(0, currentSet.weight - 5) };

        newSets[index] = {
            ...currentSet,
            dropsets: [...(currentSet.dropsets || []), newDropset]
        };
        updateExercise(exercise.id, { sets: newSets });
    };

    const removeDropsetSubSerie = (setIndex: number, dropsetIndex: number) => {
        const newSets = [...sets];
        const currentSet = newSets[setIndex];
        if (currentSet.dropsets && currentSet.dropsets.length > 0) {
            newSets[setIndex] = {
                ...currentSet,
                dropsets: currentSet.dropsets.filter((_: any, i: number) => i !== dropsetIndex)
            };
            updateExercise(exercise.id, { sets: newSets });
        }
    };

    const updateDropset = (setIndex: number, dropsetIndex: number, field: 'reps' | 'weight', value: number) => {
        const newSets = [...sets];
        const currentSet = newSets[setIndex];
        if (currentSet.dropsets) {
            const newDropsets = [...currentSet.dropsets];
            newDropsets[dropsetIndex] = { ...newDropsets[dropsetIndex], [field]: value };
            newSets[setIndex] = { ...currentSet, dropsets: newDropsets };
            updateExercise(exercise.id, { sets: newSets });
        }
    };

    const toggleBodyweight = () => {
        updateExercise(exercise.id, { includesBodyweight: !exercise.includesBodyweight });
    };

    const addSet = () => {
        const lastSet = sets.length > 0 ? sets[sets.length - 1] : { reps: 10, weight: 20 };
        const newSets = [...sets, { id: createId('set'), reps: lastSet.reps, weight: lastSet.weight }]; // Don't copy dropsets
        updateExercise(exercise.id, { sets: newSets });
    };

    const removeSet = (index: number) => {
        if (sets.length <= 1) return; // Prevent removing the last set? Or allow it? User probably wants at least 1.
        const newSets = sets.filter((_: any, i: number) => i !== index);
        updateExercise(exercise.id, { sets: newSets });
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="rounded-2xl border border-slate-200 dark:border-[#233648] bg-white dark:bg-[#1a2632] p-4 md:p-5"
        >
            <div className="flex items-center gap-3 mb-4">
                <button {...attributes} {...listeners} className="cursor-grab touch-none active:cursor-grabbing p-1 text-gray-400 hover:text-primary">
                    <span className="material-symbols-outlined">drag_indicator</span>
                </button>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h4 className="font-bold text-lg">{exercise.name}</h4>
                        <button
                            onClick={toggleBodyweight}
                            className={`text-xs px-2 py-0.5 rounded-full transition-colors ${exercise.includesBodyweight
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                : 'bg-gray-100 text-gray-400 dark:bg-surface-dark dark:text-text-muted'
                                }`}
                            title="+Peso corporal (para ejercicios como fondos, dominadas...)"
                        >
                            +PC
                        </button>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{exercise.muscleGroup}</p>
                </div>
                <button
                    onClick={() => removeExercise(exercise.id)}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 transition-colors"
                >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
            </div>

            {/* Exercise Notes */}
            <div className="mb-4 flex gap-2">
                <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3 top-3 text-gray-400 text-[18px]">edit_note</span>
                    <input
                        type="text"
                        value={exercise.notes || ''}
                        onChange={(e) => updateExercise(exercise.id, { notes: e.target.value })}
                        placeholder="Añadir notas (ej: Asiento 4, Agarre cerrado...)"
                        className="w-full bg-gray-50 dark:bg-surface-dark border border-gray-200 dark:border-surface-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-gray-400 dark:placeholder:text-text-muted/70 transition-all"
                    />
                </div>
                <div className="relative w-24">
                    <span className="material-symbols-outlined absolute left-2 top-3 text-gray-400 text-[16px]">timer</span>
                    <input
                        type="number"
                        value={exercise.restSeconds || ''}
                        onChange={(e) => updateExercise(exercise.id, { restSeconds: parseInt(e.target.value) || undefined })}
                        placeholder="90"
                        className="w-full bg-gray-50 dark:bg-surface-dark border border-gray-200 dark:border-surface-border rounded-xl py-2.5 pl-8 pr-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-gray-400 text-center transition-all"
                        title="Tiempo de descanso (segundos)"
                    />
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <div className="grid grid-cols-[28px_40px_32px_1fr_1fr_40px] gap-2 items-center px-2 mb-1">
                    <span className="text-xs font-bold text-gray-400 text-center"></span>
                    <span className="text-xs font-bold text-gray-400 text-center">#</span>
                    <span className="text-xs font-bold text-gray-400 text-center">Tipo</span>
                    <span className="text-xs font-bold text-gray-400">Peso (kg)</span>
                    <span className="text-xs font-bold text-gray-400">Reps</span>
                    <span></span>
                </div>

                <DndContext
                    sensors={setSensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleSetDragEnd}
                >
                    <SortableContext
                        items={sets.map((set: any) => set.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {sets.map((set: any, index: number) => (
                            <SortableSetRow
                                key={set.id}
                                set={set}
                                index={index}
                                totalSets={sets.length}
                                weightDrafts={weightDrafts}
                                setWeightDrafts={setWeightDrafts}
                                activeWeightId={activeWeightId}
                                setActiveWeightId={setActiveWeightId}
                                updateSet={updateSet}
                                toggleWarmup={toggleWarmup}
                                addDropsetSubSerie={addDropsetSubSerie}
                                removeSet={removeSet}
                                updateDropset={updateDropset}
                                removeDropsetSubSerie={removeDropsetSubSerie}
                            />
                        ))}
                    </SortableContext>
                </DndContext>

                <button
                    onClick={addSet}
                    className="mt-2 py-2 flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 dark:border-surface-border hover:border-primary hover:text-primary transition-all text-sm font-medium text-gray-500"
                >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Añadir Serie
                </button>
            </div>
        </div>
    );
}

function SortableSetRow({
    set,
    index,
    totalSets,
    weightDrafts,
    setWeightDrafts,
    activeWeightId,
    setActiveWeightId,
    updateSet,
    toggleWarmup,
    addDropsetSubSerie,
    removeSet,
    updateDropset,
    removeDropsetSubSerie,
}: any) {
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

    const weightDraft = weightDrafts[set.id] ?? (set.weight ? String(set.weight) : '');

    return (
        <div ref={setNodeRef} style={style} className="flex flex-col gap-1">
            {/* Main set row */}
            <div className={`grid grid-cols-[28px_40px_32px_1fr_1fr_40px] gap-2 items-center ${set.isWarmup ? 'opacity-60' : ''}`}>
                <button
                    {...attributes}
                    {...listeners}
                    className="cursor-grab touch-none active:cursor-grabbing text-gray-400 hover:text-primary flex items-center justify-center"
                    title="Arrastrar serie"
                    aria-label="Arrastrar serie"
                >
                    <span className="material-symbols-outlined text-[18px]">drag_indicator</span>
                </button>
                <div className="flex items-center justify-center">
                    <span className={`text-sm font-bold w-6 h-6 rounded flex items-center justify-center ${set.dropsets?.length > 0
                        ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                        : set.isWarmup
                            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-surface-dark/50'
                        }`}>
                        {index + 1}
                    </span>
                </div>
                <div className="flex items-center justify-center gap-0.5">
                    <button
                        onClick={() => toggleWarmup(index)}
                        className={`w-6 h-6 rounded text-[10px] font-bold transition-all ${set.isWarmup
                            ? 'bg-emerald-500 text-white'
                            : 'bg-gray-100 dark:bg-surface-dark text-gray-400 hover:bg-gray-200'
                            }`}
                        title="Calentamiento"
                    >
                        W
                    </button>
                </div>
                <input
                    type="text"
                    inputMode="decimal"
                    value={weightDraft}
                    onFocus={() => {
                        setActiveWeightId(set.id);
                        setWeightDrafts((prev: Record<string, string>) => ({
                            ...prev,
                            [set.id]: prev[set.id] ?? (set.weight ? String(set.weight) : '')
                        }));
                    }}
                    onBlur={() => {
                        setActiveWeightId(null);
                        const raw = (weightDrafts[set.id] ?? '').trim();
                        const normalized = raw.replace(',', '.');
                        if (normalized === '' || normalized === '.') {
                            updateSet(index, 'weight', 0);
                            setWeightDrafts((prev: Record<string, string>) => ({ ...prev, [set.id]: '' }));
                            return;
                        }
                        const parsed = Number(normalized);
                        if (Number.isNaN(parsed)) {
                            const fallback = set.weight ? String(set.weight) : '';
                            setWeightDrafts((prev: Record<string, string>) => ({ ...prev, [set.id]: fallback }));
                            return;
                        }
                        updateSet(index, 'weight', parsed);
                        setWeightDrafts((prev: Record<string, string>) => ({ ...prev, [set.id]: String(parsed) }));
                    }}
                    onChange={(e) => {
                        const raw = e.target.value;
                        if (!/^[0-9]*[.,]?[0-9]*$/.test(raw)) {
                            return;
                        }
                        setWeightDrafts((prev: Record<string, string>) => ({ ...prev, [set.id]: raw }));
                        const normalized = raw.replace(',', '.');
                        if (normalized === '' || normalized === '.') {
                            updateSet(index, 'weight', 0);
                            return;
                        }
                        const parsed = Number(normalized);
                        if (!Number.isNaN(parsed)) {
                            updateSet(index, 'weight', parsed);
                        }
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-surface-dark border border-gray-200 dark:border-surface-border text-center font-bold text-sm"
                    placeholder="kg"
                />
                <input
                    type="text"
                    inputMode="numeric"
                    value={set.reps ? String(set.reps) : ''}
                    onChange={(e) => {
                        const raw = e.target.value;
                        if (!/^[0-9]*$/.test(raw)) return;
                        updateSet(index, 'reps', raw === '' ? 0 : parseInt(raw, 10));
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-surface-dark border border-gray-200 dark:border-surface-border text-center font-bold text-sm"
                    placeholder="Reps"
                />
                <div className="flex gap-0.5">
                    <button
                        onClick={() => addDropsetSubSerie(index)}
                        className="p-1 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded text-orange-500 transition-colors flex items-center justify-center"
                        title="Añadir sub-serie (dropset)"
                    >
                        <span className="text-[10px] font-bold">+D</span>
                    </button>
                    <button
                        onClick={() => removeSet(index)}
                        className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-500 transition-colors flex items-center justify-center"
                        disabled={totalSets <= 1}
                        title="Eliminar serie"
                    >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                </div>
            </div>

            {/* Dropset sub-series */}
            {set.dropsets?.map((dropset: any, dIndex: number) => (
                <div key={`${index}-${dIndex}`} className="grid grid-cols-[28px_40px_32px_1fr_1fr_40px] gap-2 items-center pl-4 border-l-2 border-orange-300 dark:border-orange-600 ml-3 bg-orange-50/50 dark:bg-orange-900/10 rounded-r-lg py-1">
                    <div />
                    <div className="flex items-center justify-center">
                        <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
                            {index + 1}.{dIndex + 1}
                        </span>
                    </div>
                    <div className="text-[10px] text-orange-500 font-bold text-center">D</div>
                    <input
                        type="number"
                        value={dropset.weight}
                        onChange={(e) => updateDropset(index, dIndex, 'weight', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-surface-dark border border-orange-200 dark:border-orange-700 text-center font-bold text-sm"
                        placeholder="kg"
                    />
                    <input
                        type="text"
                        inputMode="numeric"
                        value={dropset.reps ? String(dropset.reps) : ''}
                        onChange={(e) => {
                            const raw = e.target.value;
                            if (!/^[0-9]*$/.test(raw)) return;
                            updateDropset(index, dIndex, 'reps', raw === '' ? 0 : parseInt(raw, 10));
                        }}
                        className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-surface-dark border border-orange-200 dark:border-orange-700 text-center font-bold text-sm"
                        placeholder="Reps"
                    />
                    <button
                        onClick={() => removeDropsetSubSerie(index, dIndex)}
                        className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-400 transition-colors flex items-center justify-center"
                        title="Eliminar sub-serie"
                    >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                </div>
            ))}
        </div>
    );
}

export default RoutineEditor;
