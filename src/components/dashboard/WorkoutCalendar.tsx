import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';

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
      <div key={day} className="relative flex h-10 w-10 items-center justify-center">
        <div
          onClick={isClickable ? () => handleDayClick(day) : undefined}
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all ${
            hasWorkout
              ? 'bg-primary text-white shadow-md shadow-primary/30'
              : isToday
                ? 'bg-white/12 text-white font-semibold ring-1 ring-primary/40'
                : isFuture
                  ? 'text-slate-600'
                  : 'cursor-pointer text-slate-300 hover:bg-white/10 hover:text-white'
          }`}
          title={isClickable ? 'Registrar entrenamiento' : undefined}
        >
          {day}
        </div>
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
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Agenda</p>
        <h3 className="mt-1 text-lg font-semibold text-white">Calendario</h3>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={handlePrevMonth}
          className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-colors hover:bg-white/10"
        >
          <span className="material-symbols-outlined text-slate-300">chevron_left</span>
        </button>
        <div className="text-lg font-semibold capitalize text-white">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </div>
        <button
          onClick={handleNextMonth}
          className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-colors hover:bg-white/10"
        >
          <span className="material-symbols-outlined text-slate-300">chevron_right</span>
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => (
          <div
            key={day}
            className="flex h-10 w-10 items-center justify-center text-xs font-semibold text-slate-500"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 place-items-center gap-1">{days}</div>

      {selectedDate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedDate(null)}
        >
          <div
            className="mx-4 w-full max-w-sm rounded-[28px] border border-white/10 bg-[#0f2231] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Registrar entrenamiento</h3>
              <button
                onClick={() => setSelectedDate(null)}
                className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/5"
              >
                <span className="material-symbols-outlined text-slate-300">close</span>
              </button>
            </div>

            <p className="mb-4 text-sm text-slate-400">
              <span className="material-symbols-outlined mr-1 align-text-bottom text-base">
                calendar_month
              </span>
              {formattedSelectedDate}
            </p>

            <div className="max-h-64 space-y-2 overflow-y-auto">
              <button
                onClick={handleSelectFreeWorkout}
                className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition-colors hover:border-primary"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <span className="material-symbols-outlined text-primary">add</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">Entrenamiento libre</div>
                    <div className="text-xs text-slate-400">Añade ejercicios manualmente</div>
                  </div>
                </div>
              </button>

              {savedRoutines.map((routine) => (
                <button
                  key={routine.id}
                  onClick={() => handleSelectRoutine(routine.id)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition-colors hover:border-primary"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500/10">
                      <span className="material-symbols-outlined text-cyan-300">
                        fitness_center
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{routine.name}</div>
                      <div className="text-xs text-slate-400">
                        {routine.exercises?.length || 0} ejercicios
                      </div>
                    </div>
                  </div>
                </button>
              ))}

              {savedRoutines.length === 0 && (
                <p className="py-2 text-center text-xs text-slate-400">
                  No tienes rutinas guardadas
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkoutCalendar;
