import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { Input } from './ui/input';
import { NativeSelect, NativeSelectOption } from './ui/native-select';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from './ui/sheet';
import { Button } from './ui/button';

interface ExerciseLibrarySheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAddExercise: (exercise: any) => void;
}

const ExerciseLibrarySheet: React.FC<ExerciseLibrarySheetProps> = ({
  isOpen,
  onClose,
  onAddExercise,
}) => {
  const {
    exerciseLibrary,
    loadExerciseLibrary,
    selectedMuscleFilter,
    selectedEquipmentFilter,
    exerciseSearchQuery,
    setMuscleFilter,
    setEquipmentFilter,
    setExerciseSearchQuery,
    getFilteredExercises,
  } = useStore();

  const sheetRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [sheetHeight, setSheetHeight] = useState(0);
  // Track how many times each exercise was added while the sheet is open, so the
  // user gets clear visual confirmation (no reliable haptics on iOS).
  const [addedCounts, setAddedCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadExerciseLibrary();
  }, [loadExerciseLibrary]);

  // Reset the "added" badges each time the sheet opens.
  useEffect(() => {
    if (isOpen) setAddedCounts({});
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const updateViewportMetrics = () => {
      const viewport = window.visualViewport;
      const viewportHeight = viewport?.height ?? window.innerHeight;
      const offsetTop = viewport?.offsetTop ?? 0;
      const inset = Math.max(0, window.innerHeight - viewportHeight - offsetTop);
      const baseHeight = window.innerHeight * 0.85;
      const height = Math.max(280, baseHeight - inset);

      setKeyboardInset(inset);
      setSheetHeight(height);
    };

    updateViewportMetrics();

    const viewport = window.visualViewport;
    if (viewport) {
      viewport.addEventListener('resize', updateViewportMetrics);
      viewport.addEventListener('scroll', updateViewportMetrics);
    } else {
      window.addEventListener('resize', updateViewportMetrics);
    }

    return () => {
      if (viewport) {
        viewport.removeEventListener('resize', updateViewportMetrics);
        viewport.removeEventListener('scroll', updateViewportMetrics);
      } else {
        window.removeEventListener('resize', updateViewportMetrics);
      }
    };
  }, [isOpen]);

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

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

  // Handle touch gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!sheetRef.current) return;
    if (keyboardInset > 0) return;
    const rect = sheetRef.current.getBoundingClientRect();
    const offsetY = e.touches[0].clientY - rect.top;
    if (offsetY < 80) {
      // Only drag from header area
      setIsDragging(true);
      setStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging) {
      e.preventDefault();
      const diff = e.touches[0].clientY - startY;
      if (diff > 0) {
        setCurrentY(diff);
      }
    }
  };

  const handleTouchEnd = () => {
    if (isDragging) {
      if (currentY > 100) {
        onClose();
      }
      setIsDragging(false);
      setCurrentY(0);
    }
  };

  const handleAddAndFeedback = (exercise: any) => {
    onAddExercise(exercise);
    setAddedCounts((counts) => ({
      ...counts,
      [exercise.id]: (counts[exercise.id] || 0) + 1,
    }));
    // Haptic feedback if available (no-op on iOS Safari).
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  const handleCloseTouchEnd = (event: React.TouchEvent<HTMLButtonElement>) => {
    // Mobile Safari can cancel the synthetic click when the finger moves slightly.
    // Close on touchend as well, while preventing a second synthetic activation.
    event.preventDefault();
    event.stopPropagation();
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        ref={sheetRef}
        side="bottom"
        onOverlayClick={onClose}
        className="z-[60] max-h-none gap-0 overflow-hidden rounded-t-[28px] border-slate-200 bg-white p-0 text-slate-900 shadow-sm"
        style={{
          bottom: `${keyboardInset}px`,
          height: sheetHeight ? `${sheetHeight}px` : '85dvh',
          transform: isOpen ? `translateY(${currentY}px)` : 'translateY(100%)',
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        <SheetTitle className="sr-only">Biblioteca de ejercicios</SheetTitle>
        <SheetDescription className="sr-only">Busca y añade ejercicios a la sesión.</SheetDescription>
        <div className="shrink-0 bg-white">
          {/* Drag handle */}
          <div
            className="flex justify-center pt-3 pb-2 touch-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="h-1.5 w-12 rounded-full bg-slate-300" />
          </div>

          {/* Header */}
          <div className="px-5 pb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">
                  library_books
                </span>
                <h2 className="text-xl font-bold text-slate-900">Biblioteca</h2>
              </div>
              <Button variant="ghost"
                type="button"
                aria-label="Cerrar biblioteca de ejercicios"
                onClick={onClose}
                onTouchEnd={handleCloseTouchEnd}
                className="flex size-11 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100"
              >
                <span className="material-symbols-outlined text-slate-400">close</span>
              </Button>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-[20px]">
                search
              </span>
              <Input
                value={exerciseSearchQuery}
                onChange={(e) => setExerciseSearchQuery(e.target.value)}
                className="h-11 w-full rounded-xl border-slate-200 pl-11 pr-4 text-base text-slate-900 placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 sm:text-sm"
                placeholder="Buscar ejercicio..."
                type="text"
              />
            </div>

            {/* Filters - Horizontal scroll */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
              <NativeSelect
                containerClassName="shrink-0"
                className="min-w-28 rounded-lg border-slate-200 bg-white py-2 pl-3 pr-8 text-base text-slate-900 sm:text-sm"
                value={selectedMuscleFilter || ''}
                onChange={(e) => setMuscleFilter(e.target.value || null)}
              >
                <NativeSelectOption value="">Músculo</NativeSelectOption>
                {muscleGroups.map((muscle) => (
                  <NativeSelectOption key={muscle} value={muscle}>
                    {muscle}
                  </NativeSelectOption>
                ))}
              </NativeSelect>

              <NativeSelect
                containerClassName="shrink-0"
                className="min-w-28 rounded-lg border-slate-200 bg-white py-2 pl-3 pr-8 text-base text-slate-900 sm:text-sm"
                value={selectedEquipmentFilter || ''}
                onChange={(e) => setEquipmentFilter(e.target.value || null)}
              >
                <NativeSelectOption value="">Equipo</NativeSelectOption>
                {equipmentTypes.map((eq) => (
                  <NativeSelectOption key={eq} value={eq}>
                    {eq}
                  </NativeSelectOption>
                ))}
              </NativeSelect>

              {/* Clear filters button */}
              {(selectedMuscleFilter || selectedEquipmentFilter) && (
                <Button variant="ghost"
                  onClick={() => {
                    setMuscleFilter(null);
                    setEquipmentFilter(null);
                  }}
                  className="shrink-0 px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Exercise list */}
        <div className="flex-1 min-h-0 overflow-y-auto mobile-scroll px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {filteredLibrary.length === 0 ? (
            exerciseLibrary.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <span className="mb-3 size-8 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
                <p className="text-sm text-slate-400">Cargando ejercicios…</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <span className="material-symbols-outlined mb-3 text-4xl text-slate-600">
                  search_off
                </span>
                <p className="text-sm text-slate-400">No se encontraron ejercicios</p>
              </div>
            )
          ) : (
            <div className="grid gap-2">
              {filteredLibrary.map((ex) => (
                <Button variant="ghost"
                  key={ex.id}
                  onClick={() => handleAddAndFeedback(ex)}
                  className="group flex min-h-16 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition-colors hover:bg-slate-50 active:border-blue-300 active:bg-blue-50"
                >
                  {/* Exercise icon/avatar */}
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50">
                    <span className="text-primary font-bold text-lg">{ex.name[0]}</span>
                  </div>

                  {/* Exercise info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="truncate text-sm font-semibold text-slate-900 transition-colors group-active:text-primary">
                      {ex.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500">{ex.primary_muscle}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-xs text-slate-500">{ex.equipment}</span>
                    </div>
                  </div>

                  {/* Add button — shows a confirmation count once added */}
                  {addedCounts[ex.id] ? (
                    <div className="flex h-9 min-w-9 items-center justify-center gap-1 rounded-full bg-primary px-2 transition-all">
                      <span className="material-symbols-outlined text-[18px] text-white">
                        check
                      </span>
                      {addedCounts[ex.id] > 1 && (
                      <span className="text-xs font-bold text-white">{addedCounts[ex.id]}</span>
                      )}
                    </div>
                  ) : (
                    <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center group-active:bg-primary group-active:scale-95 transition-all">
                      <span className="material-symbols-outlined text-[20px] text-primary group-active:text-white transition-colors">
                        add
                      </span>
                    </div>
                  )}
                </Button>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ExerciseLibrarySheet;
