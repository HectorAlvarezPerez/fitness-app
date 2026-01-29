import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

interface ExerciseLibrarySheetProps {
    isOpen: boolean;
    onClose: () => void;
    onAddExercise: (exercise: any) => void;
}

const ExerciseLibrarySheet: React.FC<ExerciseLibrarySheetProps> = ({ isOpen, onClose, onAddExercise }) => {
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

    useEffect(() => {
        loadExerciseLibrary();
    }, [loadExerciseLibrary]);

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

    const muscleGroups = ['Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Cuádriceps', 'Isquiotibiales', 'Glúteos', 'Gemelos', 'Core', 'Cardio', 'Full Body'];
    const equipmentTypes = ['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight', 'Kettlebell', 'Other'];

    // Handle touch gestures
    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches[0].clientY < 80) { // Only drag from header area
            setIsDragging(true);
            setStartY(e.touches[0].clientY);
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (isDragging) {
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
        // Haptic feedback if available
        if (navigator.vibrate) {
            navigator.vibrate(10);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={onClose}
            />

            {/* Sheet */}
            <div
                ref={sheetRef}
                className={`fixed inset-x-0 bottom-0 z-50 bg-[#0f1214] rounded-t-[28px] max-h-[85vh] flex flex-col transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0' : 'translate-y-full'
                    }`}
                style={{
                    transform: isOpen ? `translateY(${currentY}px)` : 'translateY(100%)',
                    transition: isDragging ? 'none' : 'transform 0.3s ease-out'
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-10 h-1 bg-white/20 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-5 pb-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-[24px]">library_books</span>
                            <h2 className="text-xl font-bold text-white">Biblioteca</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-white/5 transition-colors"
                        >
                            <span className="material-symbols-outlined text-gray-400">close</span>
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative mb-3">
                        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-[20px]">search</span>
                        <input
                            value={exerciseSearchQuery}
                            onChange={(e) => setExerciseSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-primary/50 focus:bg-white/10 placeholder:text-gray-500 transition-all"
                            placeholder="Buscar ejercicio..."
                            type="text"
                        />
                    </div>

                    {/* Filters - Horizontal scroll */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
                        <select
                            className="shrink-0 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-primary/50 appearance-none pr-8 bg-no-repeat bg-right"
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                                backgroundSize: '1.5rem'
                            }}
                            value={selectedMuscleFilter || ''}
                            onChange={(e) => setMuscleFilter(e.target.value || null)}
                        >
                            <option value="">Músculo</option>
                            {muscleGroups.map(muscle => (
                                <option key={muscle} value={muscle}>{muscle}</option>
                            ))}
                        </select>

                        <select
                            className="shrink-0 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-primary/50 appearance-none pr-8 bg-no-repeat bg-right"
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                                backgroundSize: '1.5rem'
                            }}
                            value={selectedEquipmentFilter || ''}
                            onChange={(e) => setEquipmentFilter(e.target.value || null)}
                        >
                            <option value="">Equipo</option>
                            {equipmentTypes.map(eq => (
                                <option key={eq} value={eq}>{eq}</option>
                            ))}
                        </select>

                        {/* Clear filters button */}
                        {(selectedMuscleFilter || selectedEquipmentFilter) && (
                            <button
                                onClick={() => {
                                    setMuscleFilter(null);
                                    setEquipmentFilter(null);
                                }}
                                className="shrink-0 px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-[16px]">close</span>
                                Limpiar
                            </button>
                        )}
                    </div>
                </div>

                {/* Exercise list */}
                <div className="flex-1 overflow-y-auto px-4 pb-8">
                    {filteredLibrary.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <span className="material-symbols-outlined text-4xl text-gray-600 mb-3">search_off</span>
                            <p className="text-gray-400 text-sm">No se encontraron ejercicios</p>
                        </div>
                    ) : (
                        <div className="grid gap-2">
                            {filteredLibrary.map((ex) => (
                                <button
                                    key={ex.id}
                                    onClick={() => handleAddAndFeedback(ex)}
                                    className="group flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] active:bg-white/[0.08] border border-white/5 active:border-primary/30 transition-all text-left"
                                >
                                    {/* Exercise icon/avatar */}
                                    <div className="size-12 rounded-xl bg-gradient-to-br from-primary/20 to-orange-500/10 border border-primary/10 flex items-center justify-center shrink-0">
                                        <span className="text-primary font-bold text-lg">{ex.name[0]}</span>
                                    </div>

                                    {/* Exercise info */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-white font-semibold text-sm truncate group-active:text-primary transition-colors">{ex.name}</h4>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-xs text-gray-500">{ex.primary_muscle}</span>
                                            <span className="text-gray-600">•</span>
                                            <span className="text-xs text-gray-500">{ex.equipment}</span>
                                        </div>
                                    </div>

                                    {/* Add button */}
                                    <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center group-active:bg-primary group-active:scale-95 transition-all">
                                        <span className="material-symbols-outlined text-[20px] text-primary group-active:text-white transition-colors">add</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default ExerciseLibrarySheet;
