import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

const WorkoutCalendar: React.FC = () => {
  const { workoutHistory, savedRoutines } = useStore();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const getDaysInMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

  const getFirstDayOfMonth = (date: Date) => {
    const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();

  const isWorkoutDay = (day: number) => {
    const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return workoutHistory.some((w) => {
      const wDate = new Date(w.completed_at);
      return isSameDay(wDate, checkDate);
    });
  };

  const handleDayClick = (day: number) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    clickedDate.setHours(0, 0, 0, 0);

    if (clickedDate > today) return;
    if (isWorkoutDay(day)) return;

    const yyyy = currentDate.getFullYear();
    const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleSelectFreeWorkout = () => {
    if (!selectedDate) return;
    navigate(`/routine/free/workout?date=${selectedDate}`);
    setSelectedDate(null);
  };

  const handleSelectRoutine = (routineId: string) => {
    if (!selectedDate) return;
    navigate(`/routine/${routineId}/workout?date=${selectedDate}`);
    setSelectedDate(null);
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayIndex = getFirstDayOfMonth(currentDate);

  const days = [];
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(<div key={`empty-${i}`} className="h-10 w-10" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const hasWorkout = isWorkoutDay(day);
    const isToday = isSameDay(
      new Date(),
      new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    );
    const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dayDate.setHours(0, 0, 0, 0);
    const isFuture = dayDate > today;
    const isClickable = !hasWorkout && !isFuture;

    days.push(
      <div key={day} className="relative flex h-11 w-full items-center justify-center">
        <Button
          variant="ghost"
          type="button"
          disabled={!isClickable}
          onClick={isClickable ? () => handleDayClick(day) : undefined}
          className={`flex h-11 min-h-11 w-full items-center justify-center rounded-full p-0 text-sm font-medium transition-all ${
            hasWorkout
              ? 'bg-primary text-white shadow-sm shadow-primary/10'
              : isToday
                ? 'bg-slate-100 text-slate-900 font-semibold ring-1 ring-primary/40'
                : isFuture
                  ? 'text-slate-600'
                  : 'cursor-pointer text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
          aria-label={dayDate.toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
          title={isClickable ? 'Registrar entrenamiento' : undefined}
        >
          {day}
        </Button>
      </div>
    );
  }

  const monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  const formattedSelectedDate = selectedDate
    ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '';

  return (
    <div className="mobile-card">
      <div className="mb-6">
        <h3 className="mt-1 text-lg font-semibold text-slate-900">Calendario</h3>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost"
          aria-label="Mes anterior"
          onClick={handlePrevMonth}
          className="flex size-11 min-w-11 items-center justify-center rounded-full border border-slate-200 bg-slate-50 transition-colors hover:bg-slate-100"
        >
          <span className="material-symbols-outlined text-slate-600">chevron_left</span>
        </Button>
        <div className="text-lg font-semibold capitalize text-slate-900">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </div>
        <Button variant="ghost"
          aria-label="Mes siguiente"
          onClick={handleNextMonth}
          className="flex size-11 min-w-11 items-center justify-center rounded-full border border-slate-200 bg-slate-50 transition-colors hover:bg-slate-100"
        >
          <span className="material-symbols-outlined text-slate-600">chevron_right</span>
        </Button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => (
          <div
            key={day}
            className="flex h-10 w-full items-center justify-center text-xs font-semibold text-slate-500"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 place-items-center gap-1">{days}</div>

      <Dialog
        open={Boolean(selectedDate)}
        onOpenChange={(open) => !open && setSelectedDate(null)}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-sm overflow-y-auto p-6">
          <DialogHeader className="mb-1">
            <DialogTitle>Registrar entrenamiento</DialogTitle>
          </DialogHeader>
            <DialogDescription className="mb-2 flex items-center gap-1">
              <span className="material-symbols-outlined mr-1 align-text-bottom text-base">
                calendar_month
              </span>
              {formattedSelectedDate}
            </DialogDescription>

            <div className="max-h-64 space-y-2 overflow-y-auto">
              <Button variant="ghost"
                onClick={handleSelectFreeWorkout}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition-colors hover:border-primary"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <span className="material-symbols-outlined text-primary">add</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Entrenamiento libre</div>
                    <div className="text-xs text-slate-500">Añade ejercicios manualmente</div>
                  </div>
                </div>
              </Button>

              {savedRoutines.map((routine) => (
                <Button variant="ghost"
                  key={routine.id}
                  onClick={() => handleSelectRoutine(routine.id)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left transition-colors hover:border-primary"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-cyan-50">
                      <span className="material-symbols-outlined text-cyan-700">
                        fitness_center
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{routine.name}</div>
                      <div className="text-xs text-slate-500">
                        {routine.exercises?.length || 0} ejercicios
                      </div>
                    </div>
                  </div>
                </Button>
              ))}

              {savedRoutines.length === 0 && (
                <p className="py-2 text-center text-xs text-slate-500">
                  No tienes rutinas guardadas
                </p>
              )}
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkoutCalendar;
