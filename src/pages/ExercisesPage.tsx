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
    <div className="h-full w-full overflow-y-auto">
      <div className="mobile-page max-w-4xl space-y-4">
        <section className="mobile-hero">
          <p className="mobile-kicker">Exercise library</p>
          <h1 className="mobile-title">Ejercicios</h1>
          <p className="mobile-subtitle">
            Una biblioteca más limpia para buscar, filtrar y editar sin perder ninguna capacidad.
          </p>
        </section>

        {successMessage && (
          <div className="mobile-card border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-200">
            {successMessage}
          </div>
        )}

        <section className="mobile-card p-4">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
              search
            </span>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-2xl border border-[rgba(73,133,214,0.16)] bg-[rgba(10,20,34,0.72)] px-11 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#2f8cff]"
              placeholder="Buscar ejercicios..."
              type="text"
            />
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedMuscle('')}
              className={`mobile-pill whitespace-nowrap px-5 py-2 text-sm font-semibold ${
                selectedMuscle === '' ? 'mobile-pill-active' : ''
              }`}
            >
              Todos
            </button>
            {muscleOptions.map((muscle) => (
              <button
                key={muscle}
                type="button"
                onClick={() => setSelectedMuscle(muscle)}
                className={`mobile-pill whitespace-nowrap px-5 py-2 text-sm font-semibold ${
                  selectedMuscle === muscle ? 'mobile-pill-active' : ''
                }`}
              >
                {muscle}
              </button>
            ))}
          </div>

          {equipmentOptions.length > 0 && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                  Equipo
                </span>
                <select
                  value={selectedEquipment}
                  onChange={(event) => setSelectedEquipment(event.target.value)}
                  className="w-full rounded-2xl border border-[rgba(73,133,214,0.16)] bg-[rgba(10,20,34,0.72)] px-4 py-3 text-sm text-white outline-none focus:border-[#2f8cff]"
                >
                  <option value="">Todos</option>
                  {equipmentOptions.map((equipment) => (
                    <option key={equipment} value={equipment}>
                      {equipment}
                    </option>
                  ))}
                </select>
              </label>

              <Link
                to="/exercises/new"
                className="mt-auto flex items-center justify-center gap-2 rounded-[1.1rem] bg-gradient-to-r from-[#2f8cff] to-[#1e6de5] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#2f8cff]/25"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Nuevo ejercicio
              </Link>
            </div>
          )}
        </section>

        {isLoading && (
          <div className="mobile-card p-8 text-center text-slate-400">Cargando ejercicios...</div>
        )}

        {!isLoading && error && (
          <div className="mobile-card border-red-500/20 bg-red-500/10 p-6 text-red-200">
            {error}
          </div>
        )}

        {!isLoading && !error && filteredExercises.length === 0 && (
          <div className="mobile-card p-10 text-center">
            <div className="mx-auto mb-5 flex size-20 items-center justify-center rounded-full border border-[rgba(73,133,214,0.16)] bg-[rgba(47,140,255,0.08)]">
              <span className="material-symbols-outlined text-4xl text-[#4ea0ff]">search_off</span>
            </div>
            <p className="text-xl font-bold text-white">No hay ejercicios para mostrar.</p>
            <p className="mt-2 text-sm text-slate-400">
              Crea un ejercicio nuevo o ajusta los filtros.
            </p>
          </div>
        )}

        {!isLoading && !error && filteredExercises.length > 0 && (
          <section className="space-y-3">
            {filteredExercises.map((exercise) => {
              const summarySecondary = exercise.secondary_muscles?.slice(0, 2).join(', ');
              const hasImage = Boolean(exercise.image_url);

              return (
                <button
                  key={exercise.id}
                  onClick={() => navigate(`/exercises/${exercise.id}/edit`)}
                  className="mobile-list-row w-full p-3 text-left transition-all hover:border-[rgba(73,133,214,0.3)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[rgba(47,140,255,0.12)]">
                      {hasImage ? (
                        <img
                          src={exercise.image_url || ''}
                          alt={exercise.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-bold text-[#4ea0ff]">{exercise.name[0]}</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-semibold text-white">{exercise.name}</p>
                      <p className="mt-1 truncate text-[0.7rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                        {exercise.primary_muscle || 'Sin músculo principal'}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-400">
                        {summarySecondary ? `${summarySecondary} • ` : ''}
                        {exercise.equipment || 'Sin equipo'}
                      </p>
                    </div>

                    <span className="material-symbols-outlined text-slate-500">chevron_right</span>
                  </div>
                </button>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
};

export default ExercisesPage;
