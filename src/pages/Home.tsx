import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock3, Dumbbell, History, Play, Plus, Trophy } from 'lucide-react';
import { useStore } from '../store/useStore';
import { getActiveWorkoutPath } from '../lib/activeWorkout';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import logoUrl from '../assets/logo-fitness.png';

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

  const lastWorkout = workoutHistory[0] ?? null;
  const displayName =
    userData?.user_metadata?.full_name || userData?.email?.split('@')[0] || 'Atleta';

  return (
    <div className="mobile-page h-full overflow-y-auto">
      <section className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{greeting}</p>
          <h1 className="mt-1 text-[1.75rem] font-bold tracking-tight text-slate-950">
            Hola, {displayName}
          </h1>
          <p className="mt-1 text-sm text-slate-600">¿Listo para entrenar hoy?</p>
        </div>
        <div className="mb-1 flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100">
          <img src={logoUrl} alt="Fitness" className="size-full object-cover" />
        </div>
      </section>

      {activeWorkout ? (
        <Card className="mb-4 border-blue-200 bg-blue-50/70">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Badge className="mb-2 bg-blue-100 text-blue-800 hover:bg-blue-100">En curso</Badge>
                <h2 className="text-lg font-bold text-slate-950">{activeWorkout.routineName}</h2>
                <p className="mt-1 text-sm text-slate-600">Continúa donde lo dejaste.</p>
              </div>
              <Dumbbell className="mt-1 size-5 text-blue-700" aria-hidden="true" />
            </div>
            <Button asChild className="mt-4 w-full">
              <Link to={getActiveWorkoutPath(activeWorkout.routineId)}>
                <Play className="size-4" aria-hidden="true" />
                Continuar entrenamiento
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-4 overflow-hidden border-0 bg-blue-600 text-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-blue-100">Tu próximo paso</p>
                <h2 className="mt-1 text-xl font-bold">Entrena a tu ritmo</h2>
              </div>
              <Dumbbell className="size-8 text-blue-100" aria-hidden="true" />
            </div>
            <Button asChild variant="secondary" className="mt-4 w-full">
              <Link to="/routine">
                <Play className="size-4" aria-hidden="true" />
                Elegir una rutina
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Button asChild variant="outline" className="h-auto min-h-[4.5rem] justify-start gap-3 px-3">
          <Link to="/routine">
            <span className="flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <Dumbbell className="size-5" aria-hidden="true" />
            </span>
            <span className="text-left">
              <span className="block font-semibold">Rutinas</span>
              <span className="block text-xs font-normal text-slate-500">Tus planes</span>
            </span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto min-h-[4.5rem] justify-start gap-3 px-3">
          <Link to="/history">
            <span className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <History className="size-5" aria-hidden="true" />
            </span>
            <span className="text-left">
              <span className="block font-semibold">Historial</span>
              <span className="block text-xs font-normal text-slate-500">Sesiones pasadas</span>
            </span>
          </Link>
        </Button>
      </div>

      {lastWorkout ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle>Último entrenamiento</CardTitle>
            <Trophy className="size-4 text-blue-700" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{lastWorkout.routine_name}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {new Date(lastWorkout.completed_at).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'long',
                  })}
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0">
                <Clock3 className="mr-1 size-3" aria-hidden="true" />
                {lastWorkout.duration_minutes || 0} min
              </Badge>
            </div>
            <div className="mt-4 grid grid-cols-3 divide-x divide-slate-200 rounded-lg bg-slate-50 py-3 text-center">
              <div>
                <p className="text-xs text-slate-500">Volumen</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {lastWorkout.total_volume ? `${(lastWorkout.total_volume / 1000).toFixed(1)}k` : '0'} kg
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Tiempo</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {lastWorkout.duration_minutes || 0} min
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Ejercicios</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {lastWorkout.exercises_completed?.length || 0}
                </p>
              </div>
            </div>
            <Button asChild variant="link" className="mt-3 h-9 px-0">
              <Link to="/history">
                Ver historial <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <Plus className="size-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-semibold text-slate-900">Tu progreso aparecerá aquí</h2>
              <p className="mt-1 text-sm text-slate-500">
                Completa una sesión para ver tu actividad reciente.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Home;
