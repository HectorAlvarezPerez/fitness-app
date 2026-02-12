import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { ExerciseLibraryItem } from '../store/useStore';

type ExerciseRecord = ExerciseLibraryItem & {
  user_id?: string | null;
  image_url?: string | null;
  created_at?: string;
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const ExercisesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [exercises, setExercises] = useState<ExerciseRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedMuscle, setSelectedMuscle] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(
    searchParams.get('saved') === '1' ? 'Ejercicio guardado correctamente.' : null
  );

  useEffect(() => {
    let cancelled = false;

    const loadExercises = async () => {
      setIsLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('exercises')
        .select('*')
        .order('name', { ascending: true });

      if (cancelled) return;

      if (queryError) {
        setError('No se pudieron cargar los ejercicios.');
      } else {
        setExercises((data || []) as ExerciseRecord[]);
      }

      setIsLoading(false);
    };

    void loadExercises();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!successMessage) return;

    const timeout = window.setTimeout(() => {
      setSuccessMessage(null);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('saved');
      setSearchParams(nextParams, { replace: true });
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [searchParams, setSearchParams, successMessage]);

  const muscleOptions = useMemo(() => {
    const items = new Set<string>();
    exercises.forEach((exercise) => {
      if (exercise.primary_muscle) {
        items.add(exercise.primary_muscle);
      }
    });
    return Array.from(items).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  }, [exercises]);

  const equipmentOptions = useMemo(() => {
    const items = new Set<string>();
    exercises.forEach((exercise) => {
      if (exercise.equipment) {
        items.add(exercise.equipment);
      }
    });
    return Array.from(items).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  }, [exercises]);

  const filteredExercises = useMemo(() => {
    const normalizedSearch = normalize(searchQuery);

    return exercises.filter((exercise) => {
      if (selectedMuscle && exercise.primary_muscle !== selectedMuscle) return false;
      if (selectedEquipment && exercise.equipment !== selectedEquipment) return false;
      if (normalizedSearch && !normalize(exercise.name).includes(normalizedSearch)) return false;
      return true;
    });
  }, [exercises, searchQuery, selectedMuscle, selectedEquipment]);

  return (
    <div className="h-full w-full overflow-y-auto p-4 md:p-8">
      <div className="max-w-6xl mx-auto pb-20 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-black">Exercises</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Gestiona tu base de ejercicios sin alterar el historial de entrenamientos.
            </p>
          </div>
          <Link
            to="/exercises/new"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New exercise
          </Link>
        </header>

        {successMessage && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 dark:border-[#233648] bg-white dark:bg-[#1a2632] p-4 md:p-5">
          <div className="grid gap-3 md:grid-cols-4">
            <label className="md:col-span-2 space-y-1">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Buscar</span>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-[#233648] bg-gray-50 dark:bg-[#0f1820] px-3 py-2.5 text-sm outline-none focus:border-primary"
                placeholder="Buscar por nombre..."
                type="text"
              />
            </label>

            {muscleOptions.length > 0 && (
              <label className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Músculo</span>
                <select
                  value={selectedMuscle}
                  onChange={(event) => setSelectedMuscle(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-[#233648] bg-gray-50 dark:bg-[#0f1820] px-3 py-2.5 text-sm outline-none focus:border-primary"
                >
                  <option value="">Todos</option>
                  {muscleOptions.map((muscle) => (
                    <option key={muscle} value={muscle}>
                      {muscle}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {equipmentOptions.length > 0 && (
              <label className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Equipo</span>
                <select
                  value={selectedEquipment}
                  onChange={(event) => setSelectedEquipment(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-[#233648] bg-gray-50 dark:bg-[#0f1820] px-3 py-2.5 text-sm outline-none focus:border-primary"
                >
                  <option value="">Todos</option>
                  {equipmentOptions.map((equipment) => (
                    <option key={equipment} value={equipment}>
                      {equipment}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </section>

        {isLoading && (
          <div className="rounded-2xl border border-slate-200 dark:border-[#233648] bg-white dark:bg-[#1a2632] p-8 text-center text-gray-500">
            Cargando ejercicios...
          </div>
        )}

        {!isLoading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
        )}

        {!isLoading && !error && filteredExercises.length === 0 && (
          <div className="rounded-2xl border border-slate-200 dark:border-[#233648] bg-white dark:bg-[#1a2632] p-10 text-center">
            <p className="font-bold">No hay ejercicios para mostrar.</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Crea un ejercicio nuevo o ajusta los filtros.</p>
          </div>
        )}

        {!isLoading && !error && filteredExercises.length > 0 && (
          <section className="rounded-2xl border border-slate-200 dark:border-[#233648] bg-white dark:bg-[#1a2632] overflow-hidden">
            <div className="divide-y divide-slate-200 dark:divide-[#233648]">
              {filteredExercises.map((exercise) => {
                const summarySecondary = exercise.secondary_muscles?.slice(0, 2).join(', ');
                const hasImage = Boolean(exercise.image_url);

                return (
                  <button
                    key={exercise.id}
                    onClick={() => navigate(`/exercises/${exercise.id}/edit`)}
                    className="w-full px-4 md:px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-[#0f1820] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 dark:border-[#233648] bg-gray-100 dark:bg-[#0f1820] flex items-center justify-center">
                        {hasImage ? (
                          <img src={exercise.image_url || ''} alt={exercise.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-sm font-bold text-gray-500">{exercise.name[0]}</span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-bold truncate">{exercise.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                          {exercise.primary_muscle || 'Sin músculo principal'}
                          {summarySecondary ? ` • ${summarySecondary}` : ''}
                          {exercise.equipment ? ` • ${exercise.equipment}` : ''}
                        </p>
                      </div>

                      <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ExercisesPage;
