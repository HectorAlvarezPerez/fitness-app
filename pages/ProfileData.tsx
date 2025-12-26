import React from 'react';
import { useStore } from '../store/useStore';

const ProfileData: React.FC = () => {
    const { onboardingData, updateOnboardingData, userData } = useStore();

    return (
        <div className="h-full w-full overflow-y-auto p-4 md:p-8 pb-32">
            <div className="flex flex-col max-w-3xl mx-auto gap-8">
                {/* Header */}
                <header>
                    <h1 className="text-3xl md:text-4xl font-black">Mis Datos</h1>
                    <p className="text-gray-500 mt-2">Gestiona tu información personal y objetivos.</p>
                </header>

                <div className="space-y-6">
                    {/* Profile Header */}
                    <div className="flex items-center gap-4 py-4">
                        <img
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userData?.email || 'User'}`}
                            alt="Profile Avatar"
                            className="size-16 rounded-full border-2 border-primary"
                        />
                        <div>
                            <p className="font-bold text-lg">{userData?.user_metadata?.full_name || userData?.email?.split('@')[0] || 'Usuario'}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{userData?.email || 'Modo Invitado'}</p>
                        </div>
                    </div>

                    {/* Edit Form */}
                    <div className="rounded-2xl border border-slate-200 dark:border-[#233648] bg-white dark:bg-[#1a2632] p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-gray-300">Nivel de Experiencia</label>
                                <div className="relative">
                                    <select
                                        value={onboardingData.level || ''}
                                        onChange={(e) => updateOnboardingData({ level: e.target.value })}
                                        className="w-full appearance-none px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#0f1820] border border-gray-200 dark:border-[#233648] focus:border-primary focus:ring-1 focus:ring-primary outline-none font-medium transition-all"
                                    >
                                        <option value="Principiante">Principiante</option>
                                        <option value="Intermedio">Intermedio</option>
                                        <option value="Avanzado">Avanzado</option>
                                    </select>
                                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">expand_more</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-gray-300">Objetivo Principal</label>
                                <div className="relative">
                                    <select
                                        value={onboardingData.mainGoal || ''}
                                        onChange={(e) => updateOnboardingData({ mainGoal: e.target.value })}
                                        className="w-full appearance-none px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#0f1820] border border-gray-200 dark:border-[#233648] focus:border-primary focus:ring-1 focus:ring-primary outline-none font-medium transition-all"
                                    >
                                        <option value="Perder Peso">Perder Peso</option>
                                        <option value="Fuerza">Ganar Fuerza</option>
                                        <option value="Músculo">Ganar Músculo</option>
                                        <option value="Resistencia">Resistencia</option>
                                    </select>
                                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">expand_more</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-gray-300">Peso (kg)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={onboardingData.weight || ''}
                                        onChange={(e) => updateOnboardingData({ weight: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#0f1820] border border-gray-200 dark:border-[#233648] focus:border-primary focus:ring-1 focus:ring-primary outline-none font-medium transition-all"
                                        placeholder="Ej. 75"
                                    />
                                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">monitor_weight</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-gray-300">Altura (cm)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={onboardingData.height || ''}
                                        onChange={(e) => updateOnboardingData({ height: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#0f1820] border border-gray-200 dark:border-[#233648] focus:border-primary focus:ring-1 focus:ring-primary outline-none font-medium transition-all"
                                        placeholder="Ej. 175"
                                    />
                                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">height</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Info Card */}
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                        <span className="material-symbols-outlined shrink-0">info</span>
                        <p className="text-sm">
                            Mantener tus datos actualizados nos ayuda a calcular mejor tus estadísticas y recomendarte los pesos adecuados para tus ejercicios.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileData;
