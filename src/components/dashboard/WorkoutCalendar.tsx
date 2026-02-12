import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';

const WorkoutCalendar: React.FC = () => {
    const { workoutHistory, savedRoutines } = useStore();
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        // 0 = Sunday, 1 = Monday, ...
        let day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
        // Adjust so 0 = Monday, 6 = Sunday
        return day === 0 ? 6 : day - 1;
    };

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear();
    };

    const isWorkoutDay = (day: number) => {
        const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        return workoutHistory.some(w => {
            const wDate = new Date(w.completed_at);
            return isSameDay(wDate, checkDate);
        });
    };

    const handleDayClick = (day: number) => {
        const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        clickedDate.setHours(0, 0, 0, 0);

        // Only allow past or today, skip future and days with workouts
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
    const firstDayIndex = getFirstDayOfMonth(currentDate); // 0-6 (Mon-Sun)

    // Generate calendar grid
    const days = [];
    // Empty padded days
    for (let i = 0; i < firstDayIndex; i++) {
        days.push(<div key={`empty-${i}`} className="h-10 w-10"></div>);
    }
    // Actual days
    for (let day = 1; day <= daysInMonth; day++) {
        const hasWorkout = isWorkoutDay(day);
        const isToday = isSameDay(new Date(), new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
        const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dayDate.setHours(0, 0, 0, 0);
        const isFuture = dayDate > today;
        const isClickable = !hasWorkout && !isFuture;

        days.push(
            <div key={day} className="h-10 w-10 flex items-center justify-center relative">
                <div
                    onClick={isClickable ? () => handleDayClick(day) : undefined}
                    className={`h-8 w-8 flex items-center justify-center rounded-full text-sm font-medium transition-all
                        ${hasWorkout
                            ? 'bg-primary text-white shadow-md shadow-primary/30'
                            : isToday
                                ? 'bg-gray-200 dark:bg-gray-700 text-primary font-bold cursor-pointer hover:ring-2 hover:ring-primary/50'
                                : isFuture
                                    ? 'text-slate-300 dark:text-slate-600'
                                    : 'text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20'
                        }
                    `}
                    title={isClickable ? 'Registrar entrenamiento' : undefined}
                >
                    {day}
                </div>
            </div>
        );
    }

    const monthNames = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const formattedSelectedDate = selectedDate
        ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
        : '';

    return (
        <div className="bg-white dark:bg-[#1a2632] rounded-2xl border border-slate-200 dark:border-[#233648] p-6">
            <h3 className="text-lg font-bold mb-6">Calendario</h3>

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                    <span className="material-symbols-outlined text-gray-500">chevron_left</span>
                </button>
                <div className="font-bold text-lg capitalize">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </div>
                <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                    <span className="material-symbols-outlined text-gray-500">chevron_right</span>
                </button>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
                    <div key={day} className="h-10 w-10 flex items-center justify-center text-xs font-bold text-gray-400">
                        {day}
                    </div>
                ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 place-items-center">
                {days}
            </div>

            {/* Routine Selection Modal */}
            {selectedDate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedDate(null)}>
                    <div
                        className="bg-white dark:bg-[#1a2632] rounded-2xl border border-slate-200 dark:border-[#233648] p-6 mx-4 w-full max-w-sm shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">Registrar entrenamiento</h3>
                            <button onClick={() => setSelectedDate(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                                <span className="material-symbols-outlined text-gray-400">close</span>
                            </button>
                        </div>

                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            <span className="material-symbols-outlined text-base align-text-bottom mr-1">calendar_month</span>
                            {formattedSelectedDate}
                        </p>

                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {/* Free workout option */}
                            <button
                                onClick={handleSelectFreeWorkout}
                                className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-[#0f1923] border border-slate-200 dark:border-[#233648] hover:border-primary dark:hover:border-primary transition-colors text-left"
                            >
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <span className="material-symbols-outlined text-primary">add</span>
                                </div>
                                <div>
                                    <div className="font-semibold text-sm">Entrenamiento libre</div>
                                    <div className="text-xs text-gray-400">Añade ejercicios manualmente</div>
                                </div>
                            </button>

                            {/* Saved routines */}
                            {savedRoutines.map(routine => (
                                <button
                                    key={routine.id}
                                    onClick={() => handleSelectRoutine(routine.id)}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-[#0f1923] border border-slate-200 dark:border-[#233648] hover:border-primary dark:hover:border-primary transition-colors text-left"
                                >
                                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                        <span className="material-symbols-outlined text-blue-500">fitness_center</span>
                                    </div>
                                    <div>
                                        <div className="font-semibold text-sm">{routine.name}</div>
                                        <div className="text-xs text-gray-400">
                                            {routine.exercises?.length || 0} ejercicios
                                        </div>
                                    </div>
                                </button>
                            ))}

                            {savedRoutines.length === 0 && (
                                <p className="text-xs text-gray-400 text-center py-2">
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
