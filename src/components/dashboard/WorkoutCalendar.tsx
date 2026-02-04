import React, { useState } from 'react';
import { useStore } from '../../store/useStore';

const WorkoutCalendar: React.FC = () => {
    const { workoutHistory } = useStore();
    const [currentDate, setCurrentDate] = useState(new Date());

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

        days.push(
            <div key={day} className="h-10 w-10 flex items-center justify-center relative">
                <div
                    className={`h-8 w-8 flex items-center justify-center rounded-full text-sm font-medium transition-all
                        ${hasWorkout
                            ? 'bg-primary text-white shadow-md shadow-primary/30'
                            : isToday
                                ? 'bg-gray-200 dark:bg-gray-700 text-primary font-bold'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }
                    `}
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
        </div>
    );
};

export default WorkoutCalendar;
