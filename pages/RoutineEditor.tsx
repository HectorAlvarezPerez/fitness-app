import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import ExerciseLibrarySheet from '../components/ExerciseLibrarySheet';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
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
            }
        } else {
            // Reset for new routine
            setRoutineName('Nueva Rutina');
            setExercises([]);
        }
    }, [id, savedRoutines, setRoutineName, setExercises]);

    // Load exercise library
    useEffect(() => {
        loadExerciseLibrary();
    }, [loadExerciseLibrary]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function handleDragEnd(event: any) {
        const { active, over } = event;

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
        if (!routineName.trim()) {
            alert('Por favor, ingresa un nombre para la rutina');
            return;
        }

        if (exercises.length === 0) {
            alert('Agrega al menos un ejercicio a la rutina');
            return;
        }

        const result = await saveRoutine(routineName, exercises, id);
        if (result) {
            navigate('/routine');
        }
    };

    return (
        <>
            <div className="h-full w-full flex overflow-hidden bg-slate-100 dark:bg-[#0a1218]">
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 pb-32 flex flex-col gap-6">
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
                        <div className="grid grid-cols-2 gap-3 p-1 bg-white dark:bg-surface-dark/50 border border-gray-100 dark:border-surface-border rounded-2xl">
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

    // Helper to ensure sets is an array (backward compatibility)
    const sets = Array.isArray(exercise.sets) ? exercise.sets :
        (typeof exercise.sets === 'number' ? Array(exercise.sets).fill({ reps: exercise.reps || 10, weight: exercise.weight || 20 }) : []);

    const [weightDrafts, setWeightDrafts] = useState<Record<number, string>>({});
    const [activeWeightIndex, setActiveWeightIndex] = useState<number | null>(null);

    useEffect(() => {
        setWeightDrafts((prev) => {
            const next: Record<number, string> = {};
            sets.forEach((set: any, idx: number) => {
                if (activeWeightIndex === idx && prev[idx] !== undefined) {
                    next[idx] = prev[idx];
                    return;
                }
                next[idx] = set.weight ? String(set.weight) : '';
            });
            return next;
        });
    }, [sets, activeWeightIndex]);

    const updateSet = (index: number, field: 'reps' | 'weight', value: number) => {
        const newSets = [...sets];
        newSets[index] = { ...newSets[index], [field]: value };
        updateExercise(exercise.id, { sets: newSets });
    };

    const addSet = () => {
        const lastSet = sets.length > 0 ? sets[sets.length - 1] : { reps: 10, weight: 20 };
        const newSets = [...sets, { ...lastSet }];
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
                <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-primary">
                    <span className="material-symbols-outlined">drag_indicator</span>
                </button>
                <div className="flex-1">
                    <h4 className="font-bold text-lg">{exercise.name}</h4>
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
            <div className="mb-4">
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-3 text-gray-400 text-[18px]">edit_note</span>
                    <input
                        type="text"
                        value={exercise.notes || ''}
                        onChange={(e) => updateExercise(exercise.id, { notes: e.target.value })}
                        placeholder="Añadir notas (ej: Asiento 4, Agarre cerrado...)"
                        className="w-full bg-gray-50 dark:bg-surface-dark border border-gray-200 dark:border-surface-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-gray-400 dark:placeholder:text-text-muted/70 transition-all"
                    />
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <div className="grid grid-cols-[40px_1fr_1fr_40px] gap-2 items-center px-2 mb-1">
                    <span className="text-xs font-bold text-gray-400 text-center">#</span>
                    <span className="text-xs font-bold text-gray-400">Peso (kg)</span>
                    <span className="text-xs font-bold text-gray-400">Reps</span>
                    <span></span>
                </div>

                {sets.map((set: any, index: number) => (
                    <div key={index} className="grid grid-cols-[40px_1fr_1fr_40px] gap-2 items-center">
                        <div className="flex items-center justify-center">
                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-surface-dark/50 w-6 h-6 rounded flex items-center justify-center">
                                {index + 1}
                            </span>
                        </div>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={weightDrafts[index] ?? (set.weight ? String(set.weight) : '')}
                            onFocus={() => {
                                setActiveWeightIndex(index);
                                setWeightDrafts((prev) => ({
                                    ...prev,
                                    [index]: prev[index] ?? (set.weight ? String(set.weight) : '')
                                }));
                            }}
                            onBlur={() => {
                                setActiveWeightIndex(null);
                                const raw = (weightDrafts[index] ?? '').trim();
                                const normalized = raw.replace(',', '.');
                                if (normalized === '' || normalized === '.') {
                                    updateSet(index, 'weight', 0);
                                    setWeightDrafts((prev) => ({ ...prev, [index]: '' }));
                                    return;
                                }
                                const parsed = Number(normalized);
                                if (Number.isNaN(parsed)) {
                                    const fallback = set.weight ? String(set.weight) : '';
                                    setWeightDrafts((prev) => ({ ...prev, [index]: fallback }));
                                    return;
                                }
                                updateSet(index, 'weight', parsed);
                                setWeightDrafts((prev) => ({ ...prev, [index]: String(parsed) }));
                            }}
                            onChange={(e) => {
                                const raw = e.target.value;
                                if (!/^[0-9]*[.,]?[0-9]*$/.test(raw)) {
                                    return;
                                }
                                setWeightDrafts((prev) => ({ ...prev, [index]: raw }));
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
                            type="number"
                            value={set.reps}
                            onChange={(e) => updateSet(index, 'reps', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-surface-dark border border-gray-200 dark:border-surface-border text-center font-bold text-sm"
                            placeholder="Reps"
                        />
                        <button
                            onClick={() => removeSet(index)}
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 transition-colors flex items-center justify-center"
                            disabled={sets.length <= 1}
                            title="Eliminar serie"
                        >
                            <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                    </div>
                ))}

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

export default RoutineEditor;