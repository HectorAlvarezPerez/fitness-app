import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { ACHIEVEMENTS } from '../data/achievements';

const Achievements: React.FC = () => {
    const { achievements, personalRecords, loadAchievements, loadPersonalRecords } = useStore();

    useEffect(() => {
        loadAchievements();
        loadPersonalRecords();
    }, [loadAchievements, loadPersonalRecords]);

    const unlockedCount = achievements.length;
    const totalCount = ACHIEVEMENTS.length;
    const progress = Math.round((unlockedCount / totalCount) * 100);

    const prList = Object.entries(personalRecords).sort((a, b) => new Date(b[1].date).getTime() - new Date(a[1].date).getTime());

    return (
        <div className="h-full w-full overflow-y-auto p-4 md:p-8 pb-24">
            <div className="max-w-4xl mx-auto flex flex-col gap-8">

                {/* Header */}
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl md:text-4xl font-black">Logros y Récords</h1>
                    <p className="text-gray-500 dark:text-gray-400">Tu salón de la fama personal.</p>
                </div>

                {/* Progress Card */}
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="text-center md:text-left">
                            <h2 className="text-2xl font-bold mb-2">Nivel de Conquista</h2>
                            <p className="opacity-90 max-w-md">Has desbloqueado {unlockedCount} de {totalCount} logros disponibles. ¡Sigue así!</p>
                        </div>

                        <div className="relative size-32 text-center flex items-center justify-center shrink-0">
                            <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                                <path
                                    className="text-white/20"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                />
                                <path
                                    className="text-white drop-shadow-md"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeDasharray={`${progress}, 100`}
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center flex-col">
                                <span className="text-2xl font-black">{progress}%</span>
                            </div>
                        </div>
                    </div>
                    {/* Background decoration */}
                    <span className="material-symbols-outlined absolute -bottom-8 -right-8 text-9xl opacity-10 rotate-12">emoji_events</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Achievements List */}
                    <div className="flex flex-col gap-4">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-orange-500">military_tech</span>
                            Logros
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                            {ACHIEVEMENTS.map(achievement => {
                                const isUnlocked = achievements.includes(achievement.id);
                                return (
                                    <div
                                        key={achievement.id}
                                        className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${isUnlocked
                                                ? 'bg-white dark:bg-[#1a2632] border-orange-500/30 shadow-sm'
                                                : 'bg-gray-50 dark:bg-[#0f1820] border-gray-200 dark:border-[#233648] opacity-60 grayscale'
                                            }`}
                                    >
                                        <div className={`size-12 rounded-full flex items-center justify-center shrink-0 ${isUnlocked ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-gray-200 text-gray-400 dark:bg-gray-800'
                                            }`}>
                                            <span className="material-symbols-outlined text-2xl">{achievement.icon}</span>
                                        </div>
                                        <div>
                                            <h4 className={`font-bold ${isUnlocked ? 'text-slate-900 dark:text-white' : 'text-gray-500'}`}>{achievement.title}</h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{achievement.description}</p>
                                        </div>
                                        {isUnlocked && (
                                            <span className="ml-auto material-symbols-outlined text-orange-500">check_circle</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* PR List */}
                    <div className="flex flex-col gap-4">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-500">fitness_center</span>
                            Récords Personales (PRs)
                        </h3>
                        {prList.length === 0 ? (
                            <div className="p-8 text-center bg-white dark:bg-[#1a2632] rounded-2xl border border-gray-200 dark:border-[#233648]">
                                <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">assignment</span>
                                <p className="text-gray-500">Aún no tienes récords registrados. ¡Completa tu primer entrenamiento!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {prList.map(([name, record]) => (
                                    <div key={name} className="bg-white dark:bg-[#1a2632] p-4 rounded-2xl border border-gray-200 dark:border-[#233648] flex flex-col">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-slate-800 dark:text-slate-200">{name}</h4>
                                            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold px-2 py-1 rounded-md">
                                                {new Date(record.date).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="flex items-end gap-1 mt-auto">
                                            <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                                                {record.weight}
                                            </span>
                                            <span className="text-sm font-bold text-gray-500 mb-1.5">kg</span>
                                            <span className="text-sm text-gray-400 mb-1.5 ml-2">x {record.reps} reps</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Achievements;