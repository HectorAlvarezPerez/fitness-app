import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabaseClient';
import logoUrl from '../logo-fitness.png';

const OnboardingStep3: React.FC = () => {
    const navigate = useNavigate();
    const { onboardingData, updateOnboardingData } = useStore();
    const [selectedConditions, setSelectedConditions] = useState<string[]>(onboardingData.conditions || ['Ninguna']);
    const [loading, setLoading] = useState(false);

    const toggleCondition = (condition: string) => {
        let newConditions = [...selectedConditions];
        if (condition === 'Ninguna') {
            newConditions = ['Ninguna'];
        } else {
            if (newConditions.includes('Ninguna')) {
                newConditions = newConditions.filter(c => c !== 'Ninguna');
            }
            if (newConditions.includes(condition)) {
                newConditions = newConditions.filter(c => c !== condition);
            } else {
                newConditions.push(condition);
            }
        }
        if (newConditions.length === 0) newConditions = ['Ninguna'];
        setSelectedConditions(newConditions);
        updateOnboardingData({ conditions: newConditions });
    };

    const handleConfirm = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { error } = await supabase.from('profiles').upsert({
                    id: user.id,
                    email: user.email,
                    main_goal: onboardingData.mainGoal,
                    level: onboardingData.level,
                    conditions: selectedConditions,
                    updated_at: new Date().toISOString(),
                });
                if (error) throw error;
            }
            // Add slight delay or just navigate
            navigate('/dashboard');
        } catch (error) {
            console.error('Error saving profile:', error);
            // Optionally show error message
            navigate('/dashboard'); // Proceed anyway for now or handle error
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display min-h-screen flex flex-col">
            <nav className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-[#482c23] bg-white/80 dark:bg-[#221510]/80 backdrop-blur-md">
                <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src={logoUrl} alt="Fitness App" className="size-8 object-contain" />
                        <h2 className="text-xl md:text-2xl font-bold tracking-tight">Fitness App</h2>
                    </div>
                </div>
            </nav>

            <main className="flex-grow w-full px-4 md:px-8 py-8 flex justify-center">
                <div className="max-w-[960px] w-full flex flex-col gap-10">
                    <header className="flex flex-col gap-4">
                        <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tight">Personaliza tu experiencia</h1>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800/50 w-fit">
                            <span className="material-symbols-outlined text-green-700 dark:text-green-400 text-[18px]">lock</span>
                            <span className="text-xs font-semibold text-green-800 dark:text-green-300 uppercase tracking-wide">Datos Encriptados</span>
                        </div>
                    </header>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-7 flex flex-col gap-8">
                            <section className="bg-white dark:bg-surface-dark rounded-lg p-6 md:p-8 shadow-sm border border-gray-100 dark:border-[#482c23]">
                                <div className="flex items-center gap-3 mb-6">
                                    <span className="material-symbols-outlined text-primary">medical_services</span>
                                    <h2 className="text-xl font-bold">Condiciones Médicas</h2>
                                </div>
                                <div className="flex flex-wrap gap-3 mb-6">
                                    {['Ninguna', 'Asma', 'Diabetes', 'Lesión'].map(c => (
                                        <label key={c} className="group cursor-pointer" onClick={(e) => { e.preventDefault(); toggleCondition(c); }}>
                                            <input type="checkbox" className="peer sr-only" checked={selectedConditions.includes(c)} readOnly />
                                            <div className={`flex h-10 items-center justify-center px-5 rounded-full transition-all ${selectedConditions.includes(c) ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-[#482c23] hover:bg-gray-200 dark:hover:bg-[#5a382d]'}`}>
                                                <span className="text-sm font-medium">{c}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </section>
                        </div>

                        <div className="lg:col-span-5 flex flex-col gap-6">
                            <div className="bg-gradient-to-br from-[#2e1e19] to-[#221510] rounded-2xl p-6 text-white border border-[#482c23]">
                                <h3 className="text-lg font-bold mb-3">¿Por qué es importante?</h3>
                                <p className="text-sm text-gray-300">Fitness App utiliza tus datos para calcular tu Índice de Recuperación.</p>
                            </div>
                            <div className="bg-white dark:bg-surface-dark rounded-lg p-6 md:p-8 shadow-sm border border-gray-100 dark:border-[#482c23] flex flex-col gap-6 h-full justify-between">
                                <div className="flex flex-col gap-3 pt-4 border-t border-gray-100 dark:border-[#482c23]">
                                    <button
                                        onClick={handleConfirm}
                                        disabled={loading}
                                        className="w-full bg-primary hover:bg-[#d63f0e] text-white font-bold h-12 px-8 rounded-full shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        <span>{loading ? 'Guardando...' : 'Confirmar y Continuar'}</span>
                                        {!loading && <span className="material-symbols-outlined text-[20px]">arrow_forward</span>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default OnboardingStep3;
