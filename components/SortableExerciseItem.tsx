import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Exercise } from '../store/useStore';

interface Props {
    exercise: Exercise;
    updateExercise: (id: string, updates: Partial<Exercise>) => void;
    removeExercise: (id: string) => void;
}

export const SortableExerciseItem: React.FC<Props> = ({ exercise, updateExercise, removeExercise }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: exercise.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="bg-surface-dark rounded-2xl overflow-hidden shadow-sm border border-surface-border mb-5"
        >
            <div className="flex items-center gap-5 p-5 border-b border-surface-border/50 bg-white/[0.02]">
                <span
                    {...attributes}
                    {...listeners}
                    className="material-symbols-outlined text-text-muted cursor-grab active:cursor-grabbing hover:text-white transition-colors"
                >
                    drag_indicator
                </span>
                <div className="size-14 rounded-xl bg-gray-700 shrink-0 border border-surface-border/50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white/20">fitness_center</span>
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-white">{exercise.name}</h3>
                    <p className="text-xs text-text-muted uppercase tracking-wider">{exercise.muscleGroup}</p>
                </div>
                <button
                    onClick={() => removeExercise(exercise.id)}
                    className="text-text-muted hover:text-red-500 transition-colors"
                >
                    <span className="material-symbols-outlined">delete</span>
                </button>
            </div>
            <div className="p-5">
                <div className="grid grid-cols-12 gap-4 mb-3 px-2 text-[10px] font-bold text-text-muted tracking-wider text-center">
                    <span className="col-span-1">SET</span>
                    <span className="col-span-3">ANTERIOR</span>
                    <span className="col-span-3">PESO (KG)</span>
                    <span className="col-span-3">REPS</span>
                </div>
                {[...Array(exercise.sets)].map((_, i) => (
                    <div key={i} className="grid grid-cols-12 gap-4 items-center bg-background-dark/30 p-2 rounded-xl mb-2 last:mb-0">
                        <div className="col-span-1 flex justify-center">
                            <span className="size-6 rounded-full bg-surface-dark border border-surface-border flex items-center justify-center text-xs font-bold text-white">
                                {i + 1}
                            </span>
                        </div>
                        <span className="col-span-3 text-center text-xs font-medium text-progress-teal">
                            --
                        </span>
                        <div className="col-span-3">
                            <input
                                type="number"
                                value={exercise.weight}
                                onChange={(e) => updateExercise(exercise.id, { weight: Number(e.target.value) })}
                                className="w-full bg-background-dark border border-surface-border rounded-lg text-center text-white text-sm py-1.5 focus:border-primary outline-none transition-all"
                            />
                        </div>
                        <div className="col-span-3">
                            <input
                                type="number"
                                value={exercise.reps}
                                onChange={(e) => updateExercise(exercise.id, { reps: Number(e.target.value) })}
                                className="w-full bg-background-dark border border-surface-border rounded-lg text-center text-white text-sm py-1.5 focus:border-primary outline-none transition-all"
                            />
                        </div>
                    </div>
                ))}
                <div className="mt-3 flex justify-center">
                    <button
                        onClick={() => updateExercise(exercise.id, { sets: exercise.sets + 1 })}
                        className="text-xs font-bold text-primary hover:text-white transition-colors flex items-center gap-1"
                    >
                        <span className="material-symbols-outlined text-[14px]">add</span> AGREGAR SET
                    </button>
                </div>
            </div>
        </div>
    );
};
