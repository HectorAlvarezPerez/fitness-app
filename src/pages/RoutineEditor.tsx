import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import ExerciseLibrarySheet from '../components/ExerciseLibrarySheet';
import { createId } from '../lib/id';
import { parseLocaleDecimal } from '../lib/numberUtils';
import {
  cardioDurationMinutesToSeconds,
  cardioDurationSecondsToMinutes,
  getActivityTypeFromLibraryExercise,
  isCardioExercise,
} from '../lib/trainingMetrics';
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
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { NativeSelect } from '../components/ui/native-select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

const RoutineEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [defaultRestSeconds, setDefaultRestSeconds] = useState<number>(90);
  const [supersetPickerFor, setSupersetPickerFor] = useState<string | null>(null);
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
    userData,
    activeWorkout,
  } = useStore();

  // Load routine if editing
  useEffect(() => {
    if (id) {
      const routine = savedRoutines.find((r) => r.id === id);
      if (routine) {
        setRoutineName(routine.name);
        setExercises(routine.exercises);
        setDefaultRestSeconds(routine.default_rest_seconds ?? 90);
      }
    } else {
      // Reset for new routine
      setRoutineName('Nueva Rutina');
      setExercises([]);
      setDefaultRestSeconds(userData?.default_rest_seconds ?? 90);
    }
  }, [id, savedRoutines, setRoutineName, setExercises, userData?.default_rest_seconds]);

  // Load exercise library
  useEffect(() => {
    loadExerciseLibrary();
  }, [loadExerciseLibrary]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: any) {
    const { active, over } = event;

    if (!over) return;

    if (active.id !== over.id) {
      const oldIndex = exercises.findIndex((e) => e.id === active.id);
      const newIndex = exercises.findIndex((e) => e.id === over.id);
      setExercises(arrayMove(exercises, oldIndex, newIndex));
    }
  }

  const handleAddFromLibrary = (exerciseLibItem: any) => {
    const defaultSets = userData?.default_sets_count || 3;
    const defaultReps = userData?.default_reps_count || 10;
    const defaultWeight = userData?.default_weight_kg || 20;
    const isTimeBased = exerciseLibItem.tracking_type === 'time';

    const newSets = Array.from({ length: isTimeBased ? 1 : defaultSets }, () => ({
      reps: isTimeBased ? 60 : defaultReps, // For time-based, default to 60 seconds
      weight: isTimeBased ? 0 : defaultWeight,
    }));

    addExercise({
      id: createId('ex'),
      name: exerciseLibItem.name,
      muscleGroup: exerciseLibItem.primary_muscle,
      secondaryMuscles: exerciseLibItem.secondary_muscles || [],
      secondaryMuscleFactor: exerciseLibItem.secondary_muscles?.length ? 0.35 : 0,
      restSeconds: defaultRestSeconds,
      sets: newSets,
      trackingType: exerciseLibItem.tracking_type || 'reps',
      activityType: getActivityTypeFromLibraryExercise(exerciseLibItem),
    });
  };

  const filteredLibrary = getFilteredExercises();

  const muscleGroups = [
    'Pecho',
    'Espalda',
    'Hombros',
    'Bíceps',
    'Tríceps',
    'Cuádriceps',
    'Isquiotibiales',
    'Glúteos',
    'Gemelos',
    'Core',
    'Cardio',
    'Full Body',
  ];
  const equipmentTypes = [
    'Barbell',
    'Dumbbell',
    'Cable',
    'Machine',
    'Bodyweight',
    'Kettlebell',
    'Other',
  ];

  const handleSave = async () => {
    if (!routineName.trim()) {
      alert('Por favor, ingresa un nombre para la rutina');
      return;
    }

    if (exercises.length === 0) {
      alert('Agrega al menos un ejercicio a la rutina');
      return;
    }

    const { data, error } = await saveRoutine(
      routineName,
      exercises,
      id,
      undefined,
      defaultRestSeconds
    );

    if (error) {
      alert(error);
    } else if (data) {
      navigate('/routine');
    }
  };

  // --- Supersets -----------------------------------------------------------
  const assignSuperset = (partnerId: string) => {
    const aId = supersetPickerFor;
    if (!aId || aId === partnerId) {
      setSupersetPickerFor(null);
      return;
    }
    const a = exercises.find((e) => e.id === aId);
    const b = exercises.find((e) => e.id === partnerId);
    const gid = a?.supersetId || b?.supersetId || createId('ss');
    updateExercise(aId, { supersetId: gid });
    updateExercise(partnerId, { supersetId: gid });
    setSupersetPickerFor(null);
  };

  const clearSuperset = (exId: string) => {
    const ex = exercises.find((e) => e.id === exId);
    const gid = ex?.supersetId;
    updateExercise(exId, { supersetId: undefined });
    if (gid) {
      const remaining = exercises.filter((e) => e.supersetId === gid && e.id !== exId);
      if (remaining.length === 1) updateExercise(remaining[0].id, { supersetId: undefined });
    }
  };

  const supersetBadges: Record<string, string> = {};
  let supersetLetterIdx = 0;
  exercises.forEach((e) => {
    if (e.supersetId && !supersetBadges[e.supersetId]) {
      supersetBadges[e.supersetId] = String.fromCharCode(65 + supersetLetterIdx);
      supersetLetterIdx += 1;
    }
  });

  return (
    <>
      <div className="flex h-full w-full overflow-hidden bg-slate-50 text-slate-900">
        <div className="flex-1 overflow-y-auto mobile-scroll">
          <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 pb-[calc(8rem+env(safe-area-inset-bottom)+var(--keyboard-inset,0px))] flex flex-col gap-6">
            {/* Save action (back is provided by the app header) */}
            <div className="flex items-center justify-end gap-3">
              <Button variant="ghost"
                onClick={handleSave}
                className="flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-bold text-white shadow-sm transition-all hover:shadow-sm active:scale-[0.99]"
              >
                <span className="material-symbols-outlined text-[18px]">save</span>
                <span>Guardar</span>
              </Button>
            </div>

            {/* Routine Name Input */}
            <div className="mb-2">
            <Input
              type="text"
                value={routineName}
                onChange={(e) => setRoutineName(e.target.value)}
                placeholder="Nombre de la rutina"
              className="h-auto min-h-11 w-full rounded-none border-b-2 border-transparent bg-transparent px-1 py-1 text-2xl font-black text-slate-900 outline-none transition-colors hover:border-slate-200 focus:border-primary md:text-3xl"
              />
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
              <div className="flex min-w-0 items-center rounded-xl border border-slate-200 bg-slate-50 p-2">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold uppercase leading-tight text-slate-500">Ejercicios</span>
                  <span className="text-base font-bold text-slate-900">{exercises.length}</span>
                </div>
              </div>
              <div className="flex min-w-0 items-center rounded-xl border border-slate-200 bg-slate-50 p-2">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold uppercase leading-tight text-slate-500">
                    Volumen Est.
                  </span>
                  <span className="text-base font-bold text-primary">
                    {(
                      exercises.reduce((acc, curr) => {
                        // Handle both array and legacy number format for sets
                        if (Array.isArray(curr.sets)) {
                          return acc + curr.sets.reduce((sAcc, s) => sAcc + s.weight * s.reps, 0);
                        } else {
                          // Legacy fallback
                          return acc + curr.weight! * curr.reps! * (curr.sets as unknown as number);
                        }
                      }, 0) / 1000
                    ).toFixed(1)}
                    k
                  </span>
                </div>
              </div>
              <div className="flex min-w-0 items-center rounded-xl border border-slate-200 bg-slate-50 p-2">
                <div className="flex w-full min-w-0 flex-col">
                  <span className="text-[9px] font-bold uppercase leading-tight text-slate-500">Descanso</span>
                  <div className="flex flex-wrap items-center gap-1">
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={defaultRestSeconds}
                      onChange={(e) => setDefaultRestSeconds(parseInt(e.target.value) || 60)}
                      className="h-11 min-h-11 w-[52px] min-w-[52px] border-none bg-transparent p-0 text-base font-bold text-slate-900 outline-none"
                      min={0}
                      max={600}
                    />
                    <span className="text-[10px] text-slate-500">seg</span>
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
                  items={exercises.map((e) => e.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {exercises.map((exercise) => (
                    <SortableExerciseItem
                      key={exercise.id}
                      exercise={exercise}
                      updateExercise={updateExercise}
                      removeExercise={removeExercise}
                      supersetBadge={
                        exercise.supersetId ? supersetBadges[exercise.supersetId] : undefined
                      }
                      onAddToSuperset={() => setSupersetPickerFor(exercise.id)}
                      onRemoveFromSuperset={() => clearSuperset(exercise.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>

              {exercises.length === 0 && (
                <div
                  onClick={() => setIsLibraryOpen(true)}
                  className="flex h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-500 transition-all hover:border-primary/50 hover:text-primary/70 active:scale-[0.99]"
                >
                  <span className="material-symbols-outlined text-3xl">add_circle</span>
                  <p className="font-medium text-sm">Toca aquí para añadir ejercicios</p>
                </div>
              )}

              {exercises.length > 0 && (
                <div className="flex h-20 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-500">
                  <span className="material-symbols-outlined text-xl">swap_vert</span>
                  <p className="font-medium text-xs">Arrastra para reordenar</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Exercise Library Sidebar - Desktop only */}
        <aside className="z-10 hidden h-full w-[360px] shrink-0 flex-col border-l border-slate-200 bg-white shadow-sm lg:flex">
          <div className="px-6 pt-8 pb-4">
            <h3 className="mb-6 flex items-center gap-2 text-xl font-bold text-slate-900">
              <span className="material-symbols-outlined text-primary">library_books</span>
              Biblioteca
            </h3>

            {/* Search */}
            <div className="relative group mb-3">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors">
                search
              </span>
              <Input
                value={exerciseSearchQuery}
                onChange={(e) => setExerciseSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-500 transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Buscar ejercicio..."
                type="text"
              />
            </div>

            {/* Muscle Filter */}
            <NativeSelect
              containerClassName="mb-2 w-full"
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-primary focus:outline-none"
              value={selectedMuscleFilter || ''}
              onChange={(e) => setMuscleFilter(e.target.value || null)}
            >
              <option value="">Todos los músculos</option>
              {muscleGroups.map((muscle) => (
                <option key={muscle} value={muscle}>
                  {muscle}
                </option>
              ))}
            </NativeSelect>

            {/* Equipment Filter */}
            <NativeSelect
              containerClassName="w-full"
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-primary focus:outline-none"
              value={selectedEquipmentFilter || ''}
              onChange={(e) => setEquipmentFilter(e.target.value || null)}
            >
              <option value="">Todo el equipamiento</option>
              {equipmentTypes.map((eq) => (
                <option key={eq} value={eq}>
                  {eq}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="flex-1 overflow-y-auto p-4 px-6 flex flex-col gap-3">
            {filteredLibrary.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No se encontraron ejercicios
              </p>
            ) : (
              filteredLibrary.map((ex) => (
                <div
                  key={ex.id}
                  className="group flex cursor-pointer items-center gap-3 rounded-xl border border-transparent bg-slate-50 p-2 pr-3 transition-all hover:border-slate-200 hover:bg-slate-100"
                >
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
                    <span className="text-xs text-slate-500">{ex.name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="truncate text-sm font-bold text-slate-900 transition-colors group-hover:text-primary">
                      {ex.name}
                    </h4>
                    <p className="mt-0.5 truncate text-[10px] text-slate-500">
                      {ex.primary_muscle} • {ex.equipment}
                    </p>
                  </div>
                  <Button variant="ghost"
                    onClick={() => handleAddFromLibrary(ex)}
                    className="flex size-11 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-primary transition-all hover:bg-primary hover:text-white"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                  </Button>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>

      {/* Mobile FAB - Add Exercise */}
      <Button variant="ghost"
        onClick={() => setIsLibraryOpen(true)}
        className="lg:hidden fixed right-4 z-40 size-14 rounded-full bg-primary text-white shadow-sm shadow-primary/10 flex items-center justify-center active:scale-95 transition-transform"
        style={{
          bottom: `calc(${activeWorkout ? '10.5rem' : '6rem'} + var(--keyboard-inset, 0px))`,
        }}
      >
        <span className="material-symbols-outlined text-[28px]">add</span>
      </Button>

      {/* Mobile Exercise Library Sheet */}
      <ExerciseLibrarySheet
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onAddExercise={handleAddFromLibrary}
      />

      {/* Superset partner picker */}
      <Dialog
        open={Boolean(supersetPickerFor)}
        onOpenChange={(open) => !open && setSupersetPickerFor(null)}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-md overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <DialogHeader>
            <DialogTitle>Añadir a superserie</DialogTitle>
            <DialogDescription>Elige el ejercicio con el que emparejarlo</DialogDescription>
          </DialogHeader>
            <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
              {exercises
                .filter((e) => e.id !== supersetPickerFor)
                .map((e) => (
                  <Button variant="ghost"
                    key={e.id}
                    onClick={() => assignSuperset(e.id)}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-slate-900 transition-colors hover:bg-slate-100"
                  >
                    <span className="font-semibold">{e.name}</span>
                    {e.supersetId && supersetBadges[e.supersetId] && (
                      <span className="rounded bg-violet-50 px-1.5 py-0.5 text-xs font-bold text-violet-700">
                        SS {supersetBadges[e.supersetId]}
                      </span>
                    )}
                  </Button>
                ))}
              {exercises.filter((e) => e.id !== supersetPickerFor).length === 0 && (
                <p className="text-sm text-slate-500">Añade otro ejercicio primero.</p>
              )}
            </div>
            <Button variant="ghost"
              onClick={() => setSupersetPickerFor(null)}
              className="mt-4 w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600"
            >
              Cancelar
            </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Sortable Exercise Item Component
function SortableExerciseItem({
  exercise,
  updateExercise,
  removeExercise,
  onAddToSuperset,
  onRemoveFromSuperset,
  supersetBadge,
}: any) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: exercise.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Ensure sets are arrays with stable IDs (backward compatibility)
  useEffect(() => {
    if (Array.isArray(exercise.sets)) {
      const missingId = exercise.sets.some((set: any) => !set.id);
      if (missingId) {
        const updated = exercise.sets.map((set: any) =>
          set.id ? set : { ...set, id: createId('set') }
        );
        updateExercise(exercise.id, { sets: updated });
      }
      return;
    }

    if (typeof exercise.sets === 'number') {
      const baseSets = Array.from({ length: exercise.sets }, () => ({
        id: createId('set'),
        reps: exercise.reps || 10,
        weight: exercise.weight || 20,
      }));
      updateExercise(exercise.id, { sets: baseSets });
    }
  }, [exercise.id, exercise.reps, exercise.sets, exercise.weight, updateExercise]);

  const sets = Array.isArray(exercise.sets) ? exercise.sets : [];
  const isCardioTime =
    exercise.trackingType === 'time' &&
    isCardioExercise({
      activityType: exercise.activityType,
      trackingType: exercise.trackingType,
      primaryMuscle: exercise.muscleGroup,
    });

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
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { distance: 6 },
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

  // Cycle the set type: Normal → Calentamiento (W) → Fallo (F) → Normal.
  const cycleSetType = (index: number) => {
    const newSets = [...sets];
    const s = newSets[index];
    if (!s.isWarmup && !s.isFailure) {
      newSets[index] = { ...s, isWarmup: true, isFailure: false };
    } else if (s.isWarmup) {
      newSets[index] = { ...s, isWarmup: false, isFailure: true };
    } else {
      newSets[index] = { ...s, isWarmup: false, isFailure: false };
    }
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
      dropsets: [...(currentSet.dropsets || []), newDropset],
    };
    updateExercise(exercise.id, { sets: newSets });
  };

  const removeDropsetSubSerie = (setIndex: number, dropsetIndex: number) => {
    const newSets = [...sets];
    const currentSet = newSets[setIndex];
    if (currentSet.dropsets && currentSet.dropsets.length > 0) {
      newSets[setIndex] = {
        ...currentSet,
        dropsets: currentSet.dropsets.filter((_: any, i: number) => i !== dropsetIndex),
      };
      updateExercise(exercise.id, { sets: newSets });
    }
  };

  const updateDropset = (
    setIndex: number,
    dropsetIndex: number,
    field: 'reps' | 'weight',
    value: number
  ) => {
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
      className={`mobile-card p-4 md:p-5 ${exercise.supersetId ? 'border-l-4 border-l-violet-500' : ''}`}
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex min-w-0 items-center gap-3 sm:flex-1">
          <Button
            variant="ghost"
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Arrastrar ${exercise.name}`}
            title={`Arrastrar ${exercise.name}`}
            className="min-h-11 min-w-11 cursor-grab touch-none p-1 text-slate-500 hover:text-primary active:cursor-grabbing"
          >
            <span className="material-symbols-outlined">drag_indicator</span>
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <h4 className="min-w-0 flex-1 truncate text-lg font-bold">{exercise.name}</h4>
              {supersetBadge && (
                <span
                  className="shrink-0 rounded bg-violet-50 px-1.5 py-0.5 text-xs font-bold text-violet-700"
                  title="Superserie"
                >
                  SS {supersetBadge}
                </span>
              )}
            </div>
            <p className="truncate text-sm text-slate-500">{exercise.muscleGroup}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2 sm:ml-auto">
          <Button
            variant="ghost"
            onClick={toggleBodyweight}
            className={
              exercise.includesBodyweight
                ? 'min-h-11 min-w-11 rounded-full bg-cyan-50 px-2 text-xs text-cyan-700'
                : 'min-h-11 min-w-11 rounded-full border border-slate-200 bg-slate-50 px-2 text-xs text-slate-500'
            }
            title="+Peso corporal (para ejercicios como fondos, dominadas...)"
          >
            +PC
          </Button>
          <Button
            variant="ghost"
            onClick={() => (exercise.supersetId ? onRemoveFromSuperset() : onAddToSuperset())}
            className={
              exercise.supersetId
                ? 'min-h-11 min-w-11 rounded-lg p-2 text-violet-700 hover:bg-violet-50'
                : 'min-h-11 min-w-11 rounded-lg p-2 text-slate-500 hover:bg-slate-100'
            }
            title={exercise.supersetId ? 'Quitar de superserie' : 'Añadir a superserie'}
            aria-label={exercise.supersetId ? 'Quitar de superserie' : 'Añadir a superserie'}
          >
            <span className="material-symbols-outlined text-[20px]">
              {exercise.supersetId ? 'link_off' : 'link'}
            </span>
          </Button>
          <Button
            variant="ghost"
            onClick={() => removeExercise(exercise.id)}
            className="min-h-11 min-w-11 rounded-lg p-2 text-red-600 hover:bg-red-50"
            aria-label="Eliminar ejercicio"
          >
            <span className="material-symbols-outlined text-[20px]">delete</span>
          </Button>
        </div>
      </div>

      {/* Exercise Notes */}
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-3 text-slate-500 text-[18px]">
            edit_note
          </span>
          <Input
            type="text"
            value={exercise.notes || ''}
            onChange={(e) => updateExercise(exercise.id, { notes: e.target.value })}
            placeholder="Añadir notas (ej: Asiento 4, Agarre cerrado...)"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-500 transition-all focus:outline-none focus:border-[#2f8cff] focus:ring-1 focus:ring-[#2f8cff]"
          />
        </div>
        <div className="relative w-24">
          <span className="material-symbols-outlined absolute left-2 top-3 text-slate-500 text-[16px]">
            timer
          </span>
          <Input
            type="number"
            inputMode="numeric"
            value={exercise.restSeconds ?? ''}
            onChange={(e) =>
              updateExercise(exercise.id, {
                restSeconds: e.target.value === '' ? undefined : parseInt(e.target.value, 10),
              })
            }
            placeholder="90"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-8 pr-2 text-center text-sm text-slate-900 placeholder:text-slate-500 transition-all focus:outline-none focus:border-[#2f8cff] focus:ring-1 focus:ring-[#2f8cff]"
            title="Tiempo de descanso (segundos)"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div
          className={`hidden sm:grid ${exercise.trackingType === 'time' ? 'grid-cols-[36px_36px_minmax(0,1fr)_36px_76px]' : 'grid-cols-[36px_36px_minmax(0,1fr)_minmax(0,1fr)_36px_76px]'} items-center gap-1 px-1 mb-1`}
        >
          <span className="text-center text-xs font-bold text-slate-600"></span>
          <span className="text-center text-xs font-bold text-slate-600">#</span>
          <span className="text-xs font-bold text-slate-600">
            {exercise.trackingType === 'time'
              ? isCardioTime
                ? 'Duración (min)'
                : 'Duración (seg)'
              : 'Reps'}
          </span>
          {exercise.trackingType !== 'time' && (
            <span className="text-xs font-bold text-slate-600">Peso (kg)</span>
          )}
          <span className="text-center text-xs font-bold text-slate-600">Tipo</span>
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
                trackingType={exercise.trackingType || 'reps'}
                isCardio={isCardioTime}
                weightDrafts={weightDrafts}
                setWeightDrafts={setWeightDrafts}
                activeWeightId={activeWeightId}
                setActiveWeightId={setActiveWeightId}
                updateSet={updateSet}
                toggleWarmup={cycleSetType}
                addDropsetSubSerie={addDropsetSubSerie}
                removeSet={removeSet}
                updateDropset={updateDropset}
                removeDropsetSubSerie={removeDropsetSubSerie}
              />
            ))}
          </SortableContext>
        </DndContext>

        <Button variant="ghost"
          onClick={addSet}
          className="mt-2 flex min-h-11 items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 py-2 text-sm font-medium text-slate-500 transition-all hover:border-[#2f8cff] hover:text-[#4ea0ff]"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Añadir Serie
        </Button>
      </div>
    </div>
  );
}

function SortableSetRow({
  set,
  index,
  totalSets,
  trackingType,
  isCardio,
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: set.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 5 : 'auto',
  };

  const weightDraft = weightDrafts[set.id] ?? (set.weight ? String(set.weight) : '');
  const cardioTime = trackingType === 'time' && isCardio;
  const [durationDraft, setDurationDraft] = useState(() => {
    const minutes = cardioDurationSecondsToMinutes(set.reps);
    return minutes === undefined ? '' : String(minutes);
  });
  const [isDurationFocused, setIsDurationFocused] = useState(false);
  const repsDraft = cardioTime ? durationDraft : set.reps ? String(set.reps) : '';

  useEffect(() => {
    if (cardioTime && !isDurationFocused) {
      const minutes = cardioDurationSecondsToMinutes(set.reps);
      setDurationDraft(minutes === undefined ? '' : String(minutes));
    }
  }, [cardioTime, isDurationFocused, set.reps]);

  return (
    <div ref={setNodeRef} style={style} className="border-b border-slate-200/70 py-1 last:border-b-0">
      {/* Main set row */}
      <div className={`flex min-w-0 items-center gap-1 ${set.isWarmup ? 'opacity-60' : ''}`}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          {...attributes}
          {...listeners}
          className="h-11 min-h-11 w-6 shrink-0 p-0 text-slate-500 hover:text-primary cursor-grab touch-none active:cursor-grabbing sm:w-9"
          title="Arrastrar serie"
          aria-label="Arrastrar serie"
        >
          <span className="material-symbols-outlined text-[18px]">drag_indicator</span>
        </Button>

        <span className="min-w-6 shrink-0 text-center text-xs font-bold text-slate-600 sm:w-9">
          S{index + 1}
        </span>

        <div className="flex min-w-0 flex-1 items-center gap-1">
          {/* Reps or duration */}
          <div className="relative min-w-[46px] flex-1 border-b border-transparent focus-within:border-blue-600">
            <Input
              type="text"
              inputMode={cardioTime ? 'decimal' : 'numeric'}
              aria-label={
                trackingType === 'time'
                  ? cardioTime
                    ? 'Duración de cardio'
                    : 'Duración en segundos'
                  : `Repeticiones de la serie ${index + 1}`
              }
              value={repsDraft}
              onFocus={() => cardioTime && setIsDurationFocused(true)}
              onBlur={() => cardioTime && setIsDurationFocused(false)}
              onChange={(e) => {
                const raw = e.target.value;
                if (cardioTime) {
                  if (!/^\d*([.,]\d*)?$/.test(raw)) return;
                  setDurationDraft(raw);
                  if (raw === '') {
                    updateSet(index, 'reps', 0);
                    return;
                  }
                  const minutes = parseLocaleDecimal(raw);
                  if (minutes !== null && minutes >= 0) {
                    updateSet(index, 'reps', cardioDurationMinutesToSeconds(minutes) ?? 0);
                  }
                  return;
                }
                if (!/^[0-9]*$/.test(raw)) return;
                updateSet(index, 'reps', raw === '' ? 0 : parseInt(raw, 10));
              }}
              className="h-11 w-full min-w-0 rounded-none border-0 bg-transparent pl-1.5 pr-4 py-2 text-left text-sm font-semibold text-slate-900 shadow-none outline-none placeholder:text-slate-400 focus:border-b-2 focus:border-blue-600 focus:outline-none focus:ring-0 focus-visible:border-b-2 focus-visible:border-blue-600 focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder={cardioTime ? 'Min' : trackingType === 'time' ? 'Seg' : 'Reps'}
            />
            {repsDraft && (
              <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 px-0.5 text-[8px] text-slate-500">
                {cardioTime ? 'min' : trackingType === 'time' ? 'seg' : 'rep'}
              </span>
            )}
          </div>

          {/* Weight input - hide for time-based exercises */}
          {trackingType !== 'time' && (
            <div className="relative min-w-[46px] flex-1 border-l border-slate-200/70 pl-1 focus-within:border-b-2 focus-within:border-blue-600">
              <Input
                type="text"
                inputMode="decimal"
                aria-label={`Peso en kg de la serie ${index + 1}`}
                value={weightDraft}
                onFocus={() => {
                  setActiveWeightId(set.id);
                  setWeightDrafts((prev: Record<string, string>) => ({
                    ...prev,
                    [set.id]: prev[set.id] ?? (set.weight ? String(set.weight) : ''),
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
                    setWeightDrafts((prev: Record<string, string>) => ({
                      ...prev,
                      [set.id]: fallback,
                    }));
                    return;
                  }
                  updateSet(index, 'weight', parsed);
                  setWeightDrafts((prev: Record<string, string>) => ({
                    ...prev,
                    [set.id]: String(parsed),
                  }));
                }}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (!/^[0-9]*[.,]?[0-9]*$/.test(raw)) return;
                  setWeightDrafts((prev: Record<string, string>) => ({ ...prev, [set.id]: raw }));
                  const normalized = raw.replace(',', '.');
                  if (normalized === '' || normalized === '.') {
                    updateSet(index, 'weight', 0);
                    return;
                  }
                  const parsed = Number(normalized);
                  if (!Number.isNaN(parsed)) updateSet(index, 'weight', parsed);
                }}
                className="h-11 w-full min-w-0 rounded-none border-0 bg-transparent pl-1.5 pr-4 py-2 text-left text-sm font-semibold text-slate-900 shadow-none outline-none placeholder:text-slate-400 focus:border-b-2 focus:border-blue-600 focus:outline-none focus:ring-0 focus-visible:border-b-2 focus-visible:border-blue-600 focus-visible:ring-0 focus-visible:ring-offset-0"
                placeholder="kg"
              />
              {weightDraft && (
                <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 px-0.5 text-[9px] text-slate-500">
                  kg
                </span>
              )}
            </div>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => toggleWarmup(index)}
          aria-label={
            set.isWarmup
              ? 'Calentamiento (toca para Fallo)'
              : set.isFailure
                ? 'Al fallo (toca para Normal)'
                : 'Normal (toca para Calentamiento)'
          }
          className={`h-11 min-h-11 w-7 shrink-0 rounded-lg p-0 text-xs font-bold transition-all sm:w-9 ${
            set.isWarmup
              ? 'bg-teal-600 text-white'
              : set.isFailure
                ? 'bg-red-600 text-white'
                : 'border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
          }`}
          title={
            set.isWarmup
              ? 'Calentamiento (toca para Fallo)'
              : set.isFailure
                ? 'Al fallo (toca para Normal)'
                : 'Normal (toca para Calentamiento)'
          }
        >
          {set.isWarmup ? 'W' : set.isFailure ? 'F' : '•'}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => addDropsetSubSerie(index)}
          className="h-11 min-h-11 w-7 shrink-0 rounded-lg p-0 text-orange-600 transition-colors hover:bg-orange-50 sm:w-9"
          title="Añadir sub-serie (dropset)"
          aria-label="Añadir sub-serie (dropset)"
        >
          <span className="text-[10px] font-bold">+D</span>
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => removeSet(index)}
          className="h-11 min-h-11 w-7 shrink-0 rounded-lg p-0 text-red-600 transition-colors hover:bg-red-50 sm:w-9"
          disabled={totalSets <= 1}
          title="Eliminar serie"
          aria-label="Eliminar serie"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </Button>
      </div>

      {/* Dropset sub-series */}
      {set.dropsets?.map((dropset: any, dIndex: number) => (
        <div
          key={`${index}-${dIndex}`}
          className="ml-3 flex min-w-0 items-center gap-1 border-b border-l-2 border-orange-200 bg-orange-50/40 py-1 pl-2 last:border-b-0 sm:pl-3"
        >
          <span className="w-8 shrink-0 text-center text-[10px] font-bold text-orange-700">
            {index + 1}.{dIndex + 1}
          </span>
          <span className="shrink-0 text-[10px] font-bold text-orange-700">D</span>
          <div className="relative min-w-[42px] flex-1 border-b border-transparent focus-within:border-orange-600">
            <Input
              type="number"
              inputMode="decimal"
              aria-label={`Peso en kg de la dropset ${dIndex + 1}`}
              value={dropset.weight}
              onChange={(e) =>
                updateDropset(index, dIndex, 'weight', parseFloat(e.target.value) || 0)
              }
              className="h-11 w-full min-w-0 rounded-none border-0 bg-transparent pl-1.5 pr-4 py-1.5 text-left text-sm font-semibold text-slate-900 shadow-none outline-none placeholder:text-slate-400 focus:border-b-2 focus:border-orange-600 focus:outline-none focus:ring-0 focus-visible:border-b-2 focus-visible:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder="kg"
            />
            <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 px-0.5 text-[9px] text-slate-500">
              kg
            </span>
          </div>
          <div className="relative min-w-[42px] flex-1 border-l border-orange-200 pl-1 focus-within:border-b-2 focus-within:border-orange-600">
            <Input
              type="text"
              inputMode="numeric"
              aria-label={`Repeticiones de la dropset ${dIndex + 1}`}
              value={dropset.reps ? String(dropset.reps) : ''}
              onChange={(e) => {
                const raw = e.target.value;
                if (!/^[0-9]*$/.test(raw)) return;
                updateDropset(index, dIndex, 'reps', raw === '' ? 0 : parseInt(raw, 10));
              }}
              className="h-11 w-full min-w-0 rounded-none border-0 bg-transparent pl-1.5 pr-4 py-1.5 text-left text-sm font-semibold text-slate-900 shadow-none outline-none placeholder:text-slate-400 focus:border-b-2 focus:border-orange-600 focus:outline-none focus:ring-0 focus-visible:border-b-2 focus-visible:border-orange-600 focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder="Reps"
            />
            {dropset.reps > 0 && (
              <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 px-0.5 text-[8px] text-slate-500">
                reps
              </span>
            )}
          </div>
          <Button variant="ghost"
            type="button"
            size="icon"
            onClick={() => removeDropsetSubSerie(index, dIndex)}
            className="h-11 min-h-11 w-7 shrink-0 rounded-lg p-0 text-red-600 transition-colors hover:bg-red-50 sm:w-9"
            title="Eliminar sub-serie"
            aria-label={`Eliminar dropset ${dIndex + 1}`}
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
          </Button>
        </div>
      ))}
    </div>
  );
}

export default RoutineEditor;
