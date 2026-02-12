import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import {
  derivePersonalRecordRows,
  filterAndSortPersonalRecordRows,
  formatDuration,
  PersonalRecordSort,
  PersonalRecordTypeFilter,
} from '../lib/personalRecords';

const formatWeight = (weight?: number) => {
  if (typeof weight !== 'number' || Number.isNaN(weight)) return '—';
  const decimals = Number.isInteger(weight) ? 0 : 1;
  return `${weight.toFixed(decimals)} kg`;
};

const formatReps = (reps?: number) => {
  if (typeof reps !== 'number' || Number.isNaN(reps)) return '—';
  return `${Math.round(reps)}`;
};

const formatDate = (date?: string) => {
  if (!date) return '—';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const PersonalRecordsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    workoutHistory,
    loadWorkoutHistory,
    exerciseLibrary,
    loadExerciseLibrary,
    personalRecords,
    loadPersonalRecords,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [prType, setPrType] = useState<PersonalRecordTypeFilter>('all');
  const [sortBy, setSortBy] = useState<PersonalRecordSort>('e1rm_desc');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        await Promise.all([loadWorkoutHistory(), loadExerciseLibrary(), loadPersonalRecords()]);
      } catch (err) {
        if (!cancelled) {
          setError('No se pudieron cargar los récords personales.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [loadExerciseLibrary, loadPersonalRecords, loadWorkoutHistory]);

  const rows = useMemo(
    () => derivePersonalRecordRows(workoutHistory, exerciseLibrary, personalRecords),
    [exerciseLibrary, personalRecords, workoutHistory]
  );

  const visibleRows = useMemo(
    () =>
      filterAndSortPersonalRecordRows(rows, {
        searchQuery,
        prType,
        sortBy,
      }),
    [rows, searchQuery, prType, sortBy]
  );

  return (
    <div className="h-full w-full overflow-y-auto p-4 md:p-8">
      <div className="max-w-6xl mx-auto pb-20 space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-black">Personal Records</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Tus mejores marcas actuales por ejercicio.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 dark:border-[#233648] bg-white dark:bg-[#1a2632] p-4 md:p-5">
          <div className="grid gap-3 md:grid-cols-4">
            <label className="md:col-span-2 space-y-1">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Buscar</span>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-[#233648] bg-gray-50 dark:bg-[#0f1820] px-3 py-2.5 text-sm outline-none focus:border-primary"
                placeholder="Buscar ejercicio..."
                type="text"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Filtro</span>
              <select
                value={prType}
                onChange={(event) => setPrType(event.target.value as PersonalRecordTypeFilter)}
                className="w-full rounded-xl border border-slate-200 dark:border-[#233648] bg-gray-50 dark:bg-[#0f1820] px-3 py-2.5 text-sm outline-none focus:border-primary"
              >
                <option value="all">Todos</option>
                <option value="strength">Strength (e1RM)</option>
                <option value="reps">Reps</option>
                <option value="time">Time</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">Ordenar</span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as PersonalRecordSort)}
                className="w-full rounded-xl border border-slate-200 dark:border-[#233648] bg-gray-50 dark:bg-[#0f1820] px-3 py-2.5 text-sm outline-none focus:border-primary"
              >
                <option value="e1rm_desc">Highest e1RM</option>
                <option value="reps_desc">Most reps</option>
                <option value="time_desc">Longest time</option>
                <option value="updated_desc">Recently updated</option>
                <option value="name_asc">A-Z</option>
              </select>
            </label>
          </div>
        </section>

        {isLoading && (
          <div className="rounded-2xl border border-slate-200 dark:border-[#233648] bg-white dark:bg-[#1a2632] p-8 text-center text-gray-500">
            Cargando récords...
          </div>
        )}

        {!isLoading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            {error}
          </div>
        )}

        {!isLoading && !error && visibleRows.length === 0 && (
          <div className="rounded-2xl border border-slate-200 dark:border-[#233648] bg-white dark:bg-[#1a2632] p-10 text-center">
            <p className="text-lg font-bold">No PRs available yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Log a workout to generate PRs.
            </p>
            <Link
              to="/routine"
              className="inline-flex mt-5 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white"
            >
              Log workout
            </Link>
          </div>
        )}

        {!isLoading && !error && visibleRows.length > 0 && (
          <section className="rounded-2xl border border-slate-200 dark:border-[#233648] bg-white dark:bg-[#1a2632] overflow-hidden">
            <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-3 px-5 py-3 border-b border-slate-200 dark:border-[#233648] text-xs font-bold uppercase tracking-wide text-gray-500">
              <span>Exercise</span>
              <span>Best e1RM</span>
              <span>Best reps</span>
              <span>Best time</span>
              <span>Updated</span>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-[#233648]">
              {visibleRows.map((row) => (
                <button
                  key={row.exerciseKey}
                  data-testid="pr-row"
                  onClick={() => {
                    if (row.exerciseId) {
                      navigate(`/exercises/${row.exerciseId}/edit`);
                      return;
                    }
                    navigate(`/exercises?search=${encodeURIComponent(row.exerciseName)}`);
                  }}
                  className="w-full px-4 md:px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-[#0f1820] transition-colors"
                >
                  <div className="grid gap-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr] md:items-center">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{row.exerciseName}</p>
                      {row.primaryMuscle && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{row.primaryMuscle}</p>
                      )}
                    </div>

                    <p className="text-sm text-slate-700 dark:text-gray-200">
                      <span className="md:hidden text-gray-500">e1RM: </span>
                      {formatWeight(row.bestE1RM)}
                    </p>
                    <p className="text-sm text-slate-700 dark:text-gray-200">
                      <span className="md:hidden text-gray-500">Reps: </span>
                      {formatReps(row.bestReps)}
                    </p>
                    <p className="text-sm text-slate-700 dark:text-gray-200">
                      <span className="md:hidden text-gray-500">Time: </span>
                      {typeof row.bestTimeSeconds === 'number' ? formatDuration(row.bestTimeSeconds) : '—'}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-gray-400">
                      <span className="md:hidden text-gray-500">Updated: </span>
                      {formatDate(row.updatedAt)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default PersonalRecordsPage;
