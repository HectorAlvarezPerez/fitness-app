import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';

const OnboardingStep2: React.FC = () => {
    const { onboardingData, updateOnboardingData } = useStore();
    const [selectedGoal, setSelectedGoal] = useState<string>(onboardingData.mainGoal || 'Pérdida de Grasa');
    const [selectedLevel, setSelectedLevel] = useState<string>(onboardingData.level || 'Intermedio');

    useEffect(() => {
        updateOnboardingData({ mainGoal: selectedGoal, level: selectedLevel });
    }, [selectedGoal, selectedLevel, updateOnboardingData]);

    const goals = [
        {
            name: 'Pérdida de Grasa',
            desc: 'Alta intensidad.',
            img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA-f8MYfLkUZxxJzclPvV9M1NZ4NqN2mcEYYLZel1sugKL7K_3EKPgXhFf7_Ho5XlXIUAAqRs66I41Ki8FN83P_1d1ip-33T_p6nFpbRiHVCobgSZawKmj-qkNXKWsObEUfgMVXoNTjH37JFUTr0PaRs1U6tE5Y9GEYv223Ig8Lti1kS0EuLUV1OSqzv1txU58-OlUCGsXaCs-dT4ZF6MDmxtiX4p5ghP8LkhWQVAeJfxH_41GwD1v8tyjH-k2Y3k915NKiX36sHdA'
        },
        {
            name: 'Fuerza',
            desc: 'Hipertrofia y Potencia.',
            img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop'
        },
        {
            name: 'Movilidad',
            desc: 'Flexibilidad y Salud.',
            img: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=1470&auto=format&fit=crop'
        }
    ];

    const levels = ['Principiante', 'Intermedio', 'Atleta'];

    return (
        <div className="relative flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-gray-900 dark:text-white">
            {/* Navbar */}
            <header className="flex items-center justify-between whitespace-nowrap border-b border-gray-200 dark:border-[#482c23] px-6 py-4 bg-background-light dark:bg-background-dark sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <div className="size-8 text-primary"><span className="material-symbols-outlined text-4xl">fitness_center</span></div>
                    <h2 className="text-xl font-bold">Fitness App</h2>
                </div>
                <div className="hidden md:flex gap-8 items-center">
                    <nav className="flex items-center gap-9 text-sm font-medium">
                        <Link to="/onboarding/step1" className="hover:text-primary">Dashboard</Link>
                        <span className="text-primary">Objetivos</span>
                    </nav>
                    <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border-2 border-primary/20" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBrAW1iYPtJJNZftMEjUMDY1aRApmN1yNxinBZJpIyMIDtYMYqXDIMPJqhy_SXDwaJBxICa_DEw5n_7ND_zj-1UUyWIsxmYZqK8wrvx_lfxr2Q1MPMl9qB-xy5QupArDXR1EM2OboseSaRmPjoFQkKdu-Q8-FyZODb8pMIBGFY3cXQFexxJUyLbuoT8AZmLQNY18C7OODgEciyf0wO6hGt70TnQTwYdhm2sX1vsHTaSaRmevbUqgAK_mz_WKjEE72E7If3RjUvyiXc")' }}></div>
                </div>
            </header>

            <main className="flex h-full grow flex-col items-center pb-24">
                <div className="w-full px-4 md:px-10 py-6 max-w-[960px] flex flex-col gap-8">
                    {/* Progress */}
                    <div className="flex flex-col gap-3">
                        <div className="flex gap-6 justify-between items-end">
                            <div className="flex flex-col gap-1">
                                <span className="text-primary text-xs font-bold uppercase tracking-wider">Configuración Inicial</span>
                                <p className="text-base font-medium">Paso 2 de 5: Calibración</p>
                            </div>
                            <p className="text-sm font-bold text-primary">40%</p>
                        </div>
                        <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-[#673f32] overflow-hidden">
                            <div className="h-full rounded-full bg-primary transition-all duration-500 ease-out" style={{ width: '40%' }}></div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 mt-4">
                        <h1 className="text-4xl md:text-5xl font-black">Define Tu Camino</h1>
                        <p className="text-gray-500 dark:text-[#c9a092] text-lg">Ayuda a nuestra IA a construir tu plan perfecto.</p>
                    </div>

                    {/* Goals Cards */}
                    <section className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-primary">flag</span>
                            <h3 className="text-xl font-bold">Objetivo Principal</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {goals.map((goal, i) => (
                                <div
                                    key={i}
                                    onClick={() => setSelectedGoal(goal.name)}
                                    className={`group relative flex flex-col gap-3 p-4 rounded-xl cursor-pointer bg-white dark:bg-[#2c1b15] border-2 transition-all shadow-lg ${selectedGoal === goal.name ? 'border-primary shadow-primary/10' : 'border-transparent hover:border-primary/50'}`}
                                >
                                    {selectedGoal === goal.name && (
                                        <div className="absolute top-4 right-4 size-6 rounded-full bg-primary flex items-center justify-center"><span className="material-symbols-outlined text-white text-sm font-bold">check</span></div>
                                    )}
                                    <div className={`w-full h-32 bg-center bg-cover rounded-lg ${selectedGoal !== goal.name ? 'grayscale group-hover:grayscale-0' : ''}`} style={{ backgroundImage: `url("${goal.img}")` }}></div>
                                    <div><p className="text-lg font-bold group-hover:text-primary transition-colors">{goal.name}</p><p className="text-sm text-gray-500">{goal.desc}</p></div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="flex flex-col gap-4 mt-2">
                        <div className="flex items-center gap-2 mb-2"><span className="material-symbols-outlined text-primary">equalizer</span><h3 className="text-xl font-bold">Nivel</h3></div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-1 bg-white dark:bg-[#2c1b15] rounded-xl">
                            {levels.map((level) => (
                                <button
                                    key={level}
                                    onClick={() => setSelectedLevel(level)}
                                    className={`py-6 px-4 rounded-lg font-bold transition-all ${selectedLevel === level ? 'bg-primary text-white shadow-lg' : 'hover:bg-gray-100 dark:hover:bg-[#3a251e]'}`}
                                >
                                    {level}
                                </button>
                            ))}
                        </div>
                    </section>
                </div>
                {/* FAB */}
                <div className="fixed bottom-6 right-6 md:right-10 z-40 flex items-center gap-4">
                    <div className="hidden md:flex bg-background-dark/80 backdrop-blur-md px-4 py-2 rounded-full border border-gray-700 text-sm text-white">
                        <span className="material-symbols-outlined text-primary text-sm mr-2 animate-pulse">auto_awesome</span> AI calibrando...
                    </div>
                    <Link to="/onboarding/step3" className="flex items-center justify-center gap-2 bg-primary hover:bg-[#d63f0e] text-white font-bold text-lg px-8 py-4 rounded-full shadow-lg shadow-primary/30 transition-all hover:scale-105">
                        Siguiente Paso <span className="material-symbols-outlined">arrow_forward</span>
                    </Link>
                </div>
            </main>
        </div>
    );
};

export default OnboardingStep2;