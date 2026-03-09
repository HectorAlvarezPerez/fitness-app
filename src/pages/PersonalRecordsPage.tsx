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
      } catch {
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
    <div className="h-full w-full overflow-y-auto">
      <div className="mobile-page max-w-5xl space-y-4">
        <section className="mobile-hero">
          <p className="mobile-kicker">Personal records</p>
          <h1 className="mobile-title">PRs</h1>
          <p className="mobile-subtitle">Tus mejores marcas actuales por ejercicio, más claras y filtrables.</p>
        </section>

        <section className="mobile-card p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <label className="space-y-2 md:col-span-2">
              <span className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                Buscar
              </span>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-2xl border border-[rgba(73,133,214,0.16)] bg-[rgba(10,20,34,0.72)] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#2f8cff]"
                placeholder="Buscar ejercicio..."
                type="text"
              />
            </label>

            <label className="space-y-2">
              <span className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                Filtro
              </span>
              <select
                value={prType}
                onChange={(event) => setPrType(event.target.value as PersonalRecordTypeFilter)}
                className="w-full rounded-2xl border border-[rgba(73,133,214,0.16)] bg-[rgba(10,20,34,0.72)] px-4 py-3 text-sm text-white outline-none focus:border-[#2f8cff]"
              >
                <option value="all">Todos</option>
                <option value="strength">Strength (e1RM)</option>
                <option value="reps">Reps</option>
                <option value="time">Time</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                Ordenar
              </span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as PersonalRecordSort)}
                className="w-full rounded-2xl border border-[rgba(73,133,214,0.16)] bg-[rgba(10,20,34,0.72)] px-4 py-3 text-sm text-white outline-none focus:border-[#2f8cff]"
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

        {isLoading && <div className="mobile-card p-8 text-center text-slate-400">Cargando récords...</div>}

        {!isLoading && error && (
          <div className="mobile-card border-red-500/20 bg-red-500/10 p-6 text-red-200">{error}</div>
        )}

        {!isLoading && !error && visibleRows.length === 0 && (
          <div className="mobile-card p-10 text-center">
            <div className="mx-auto mb-5 flex size-20 items-center justify-center rounded-full border border-[rgba(73,133,214,0.16)] bg-[rgba(47,140,255,0.08)]">
              <span className="material-symbols-outlined text-4xl text-[#4ea0ff]">military_tech</span>
            </div>
            <p className="text-lg font-bold text-white">No hay PRs todavía</p>
            <p className="mt-2 text-sm text-slate-400">Registra un entrenamiento para generar PRs.</p>
            <Link
              to="/routine"
              className="mt-5 inline-flex items-center gap-2 rounded-[1.1rem] bg-gradient-to-r from-[#2f8cff] to-[#1e6de5] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#2f8cff]/25"
            >
              Registrar entrenamiento
            </Link>
          </div>
        )}

        {!isLoading && !error && visibleRows.length > 0 && (
          <section className="space-y-3">
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
                className="mobile-list-row w-full p-4 text-left transition-all hover:border-[rgba(73,133,214,0.3)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-bold text-white">{row.exerciseName}</p>
                    {row.primaryMuscle && (
                      <p className="mt-1 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                        {row.primaryMuscle}
                      </p>
                    )}
                  </div>
                  <span className="material-symbols-outlined text-slate-500">chevron_right</span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="mobile-card-soft p-3">
                    <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                      e1RM
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">{formatWeight(row.bestE1RM)}</p>
                  </div>
                  <div className="mobile-card-soft p-3">
                    <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                      Reps
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">{formatReps(row.bestReps)}</p>
                  </div>
                  <div className="mobile-card-soft p-3">
                    <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                      Tiempo
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {typeof row.bestTimeSeconds === 'number' ? formatDuration(row.bestTimeSeconds) : '—'}
                    </p>
                  </div>
                  <div className="mobile-card-soft p-3">
                    <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                      Actualizado
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">{formatDate(row.updatedAt)}</p>
                  </div>
                </div>
              </button>
            ))}
          </section>
        )}
      </div>
    </div>
  );
};

export default PersonalRecordsPage;
