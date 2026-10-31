import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { getActiveWorkoutPath } from '../lib/activeWorkout';

const Home: React.FC = () => {
  const {
    userData,
    activeWorkout,
    workoutHistory,
    loadUserData,
    loadWorkoutHistory,
    loadActiveWorkout,
  } = useStore();
  const [greeting, setGreeting] = useState('Hola');

  useEffect(() => {
    loadUserData();
    loadWorkoutHistory();
    loadActiveWorkout();

    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Buenos días');
    else if (hour < 20) setGreeting('Buenas tardes');
    else setGreeting('Buenas noches');
  }, [loadUserData, loadWorkoutHistory, loadActiveWorkout]);

  const lastWorkout = workoutHistory.length > 0 ? workoutHistory[0] : null;
  const displayName =
    userData?.user_metadata?.full_name || userData?.email?.split('@')[0] || 'Atleta';

  return (
    <div className="mobile-page overflow-y-auto">
      <section className="mobile-hero">
        <p className="mobile-kicker">{greeting}</p>
        <h1 className="mobile-title">
          Hola, <span className="text-[#4ea0ff]">{displayName}</span>
        </h1>
        <p className="mobile-subtitle">
          Todo lo importante de tu entrenamiento concentrado en un panel más claro y rápido.
        </p>
      </section>

      <div className="space-y-4">
        {activeWorkout && (
          <div className="mobile-card overflow-hidden p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="mobile-kicker">En curso</p>
                <h2 className="mt-2 text-2xl font-bold text-white">{activeWorkout.routineName}</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Continúa exactamente donde lo dejaste.
                </p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(47,140,255,0.16)]">
                <span className="material-symbols-outlined text-[28px] text-[#4ea0ff]">
                  fitness_center
                </span>
              </div>
            </div>

            <Link
              to={getActiveWorkoutPath(activeWorkout.routineId)}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2f8cff] to-[#1e6de5] px-5 py-4 text-sm font-bold text-white shadow-lg shadow-[#2f8cff]/25"
            >
              <span>Continuar entrenamiento</span>
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </Link>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Link to="/routine" className="mobile-card p-4">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(47,140,255,0.14)]">
              <span className="material-symbols-outlined text-[24px] text-[#4ea0ff]">
                format_list_bulleted
              </span>
            </div>
            <h3 className="text-lg font-bold text-white">Rutinas</h3>
            <p className="mt-1 text-sm leading-5 text-slate-400">
              Tus planes, carpetas y accesos directos.
            </p>
          </Link>

          <Link to="/history" className="mobile-card p-4">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(47,140,255,0.14)]">
              <span className="material-symbols-outlined text-[24px] text-[#4ea0ff]">
                history
              </span>
            </div>
            <h3 className="text-lg font-bold text-white">Historial</h3>
            <p className="mt-1 text-sm leading-5 text-slate-400">
              Revisa duración, volumen y PRs.
            </p>
          </Link>
        </div>

        <div className="mobile-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="mobile-kicker">Accesos rápidos</p>
              <h3 className="mt-2 text-xl font-bold text-white">Explora la app</h3>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link to="/dashboard" className="mobile-card-soft p-4">
              <span className="material-symbols-outlined text-[22px] text-[#4ea0ff]">
                bar_chart
              </span>
              <p className="mt-3 font-semibold text-white">Stats</p>
              <p className="mt-1 text-xs text-slate-400">Resumen y músculo</p>
            </Link>
            <Link to="/progress" className="mobile-card-soft p-4">
              <span className="material-symbols-outlined text-[22px] text-[#4ea0ff]">
                monitoring
              </span>
              <p className="mt-3 font-semibold text-white">Progreso</p>
              <p className="mt-1 text-xs text-slate-400">Evolución corporal</p>
            </Link>
            <Link to="/exercises" className="mobile-card-soft p-4">
              <span className="material-symbols-outlined text-[22px] text-[#4ea0ff]">
                list_alt
              </span>
              <p className="mt-3 font-semibold text-white">Ejercicios</p>
              <p className="mt-1 text-xs text-slate-400">Biblioteca completa</p>
            </Link>
            <Link to="/pr" className="mobile-card-soft p-4">
              <span className="material-symbols-outlined text-[22px] text-[#4ea0ff]">
                military_tech
              </span>
              <p className="mt-3 font-semibold text-white">PRs</p>
              <p className="mt-1 text-xs text-slate-400">Tus mejores marcas</p>
            </Link>
          </div>
        </div>

        {lastWorkout && (
          <div className="mobile-card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="mobile-kicker">Último entreno</p>
                <h3 className="mt-2 text-xl font-bold text-white">{lastWorkout.routine_name}</h3>
              </div>
              <span className="rounded-full bg-[rgba(47,140,255,0.12)] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#4ea0ff]">
                {new Date(lastWorkout.completed_at).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="mobile-card-soft p-3">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                  Volumen
                </p>
                <p className="mt-2 text-lg font-bold text-white">
                  {lastWorkout.total_volume ? `${(lastWorkout.total_volume / 1000).toFixed(1)}k` : '0'}
                </p>
              </div>
              <div className="mobile-card-soft p-3">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                  Tiempo
                </p>
                <p className="mt-2 text-lg font-bold text-white">{lastWorkout.duration_minutes || 0}m</p>
              </div>
              <div className="mobile-card-soft p-3">
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                  Ejercicios
                </p>
                <p className="mt-2 text-lg font-bold text-white">
                  {lastWorkout.exercises_completed?.length || 0}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
