import React from 'react';
import { Link } from 'react-router-dom';

const OnboardingStep1: React.FC = () => {
  return (
    <div className="relative flex h-full min-h-screen w-full flex-col bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white overflow-x-hidden">
        {/* Navbar */}
        <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-gray-200 dark:border-surface-border px-6 lg:px-10 py-4 bg-white dark:bg-background-dark z-20 sticky top-0">
            <div className="flex items-center gap-4">
                <div className="size-8 text-primary"><span className="material-symbols-outlined text-3xl">fitness_center</span></div>
                <h2 className="text-xl font-bold leading-tight tracking-tight">Fitness App</h2>
            </div>
            <div className="hidden md:flex flex-1 justify-end gap-8 items-center">
                <nav className="flex items-center gap-9">
                    <Link to="/" className="text-sm font-medium leading-normal hover:text-primary transition-colors">Inicio</Link>
                    <span className="text-sm font-medium leading-normal text-primary">Onboarding</span>
                </nav>
                <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 ring-2 ring-primary/20" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAmHgD4H0b0fxq_zwJmGDr7CcN5EhNyZFicV3SWfZcTJxKjBZ5QqjHBnmHdb75OlQR_RkCMBU-Ibo0v4O6hB8Eno8JFAemR-02gWIXR9ZHzp2f6XxWllbqntv-Tsxo-g-ygVoYT7juH--Memi8UYm8iUEqgCym8xNvhor_bthIVpD1pz_RqewJdu4VMcKRuBq1tlvFao0iJvGkOfPKsaqTf__wJ120ToBYV3S2IbOiZFLFpmFgw1h4vKp9wG_DnacAwkByikrKKzUA")'}}></div>
            </div>
        </header>
        
        <main className="flex-grow flex flex-col items-center justify-center p-4 lg:p-8 relative">
            {/* Background */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]"></div>
            </div>

            <div className="w-full max-w-4xl z-10 flex flex-col gap-8">
                {/* Progress */}
                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-wider text-primary mb-2">Paso 1 de 4</p>
                            <h1 className="text-3xl md:text-5xl font-black leading-tight tracking-tight">Vamos a conocerte</h1>
                        </div>
                        <div className="hidden md:block text-right">
                            <p className="text-text-secondary text-base font-medium">Progreso</p>
                            <p className="text-2xl font-bold text-primary">25%</p>
                        </div>
                    </div>
                    <div className="h-3 w-full bg-gray-200 dark:bg-surface-border rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-primary to-progress-end w-[25%] rounded-full shadow-[0_0_10px_rgba(236,73,19,0.5)]"></div>
                    </div>
                </div>

                {/* Form */}
                <form className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-4">
                    <div className="md:col-span-12 p-6 rounded-2xl md:rounded-[2rem] bg-white dark:bg-surface-dark border border-gray-100 dark:border-surface-border shadow-lg">
                        <label className="block text-lg font-bold mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">wc</span> Género biológico
                        </label>
                        <div className="flex flex-wrap gap-4">
                            {['Hombre', 'Mujer', 'Otro'].map((g) => (
                                <label key={g} className="cursor-pointer group relative flex-1 min-w-[120px]">
                                    <input type="radio" name="gender" className="peer sr-only" />
                                    <div className="h-16 flex items-center justify-center rounded-xl border border-gray-200 dark:border-surface-border bg-gray-50 dark:bg-[#2a1a15] text-gray-500 dark:text-text-secondary transition-all peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary hover:bg-gray-100 dark:hover:bg-[#3a251e]">
                                        <span className="font-medium text-lg">{g}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                    
                    <div className="md:col-span-4 p-6 rounded-2xl md:rounded-[2rem] bg-white dark:bg-surface-dark border border-gray-100 dark:border-surface-border shadow-lg group">
                        <label className="block text-lg font-bold mb-4 flex items-center gap-2 group-focus-within:text-primary transition-colors">
                            <span className="material-symbols-outlined">cake</span> Edad
                        </label>
                        <div className="relative flex items-end">
                            <input type="number" placeholder="25" className="w-full bg-transparent border-none text-5xl md:text-6xl font-light p-0 placeholder:text-gray-200 dark:placeholder:text-[#3a251e] focus:ring-0 text-slate-900 dark:text-white" />
                            <span className="text-text-secondary pb-3 text-lg font-medium">años</span>
                        </div>
                    </div>

                    <div className="md:col-span-4 p-6 rounded-2xl md:rounded-[2rem] bg-white dark:bg-surface-dark border border-gray-100 dark:border-surface-border shadow-lg group">
                        <label className="block text-lg font-bold mb-4 flex items-center gap-2 group-focus-within:text-primary transition-colors">
                            <span className="material-symbols-outlined">height</span> Altura
                        </label>
                        <div className="relative flex items-end">
                            <input type="number" placeholder="175" className="w-full bg-transparent border-none text-5xl md:text-6xl font-light p-0 placeholder:text-gray-200 dark:placeholder:text-[#3a251e] focus:ring-0 text-slate-900 dark:text-white" />
                            <span className="text-text-secondary pb-3 text-lg font-medium">cm</span>
                        </div>
                    </div>

                    <div className="md:col-span-4 p-6 rounded-2xl md:rounded-[2rem] bg-white dark:bg-surface-dark border border-gray-100 dark:border-surface-border shadow-lg group">
                        <label className="block text-lg font-bold mb-4 flex items-center gap-2 group-focus-within:text-primary transition-colors">
                            <span className="material-symbols-outlined">monitor_weight</span> Peso
                        </label>
                        <div className="relative flex items-end">
                            <input type="number" placeholder="70" className="w-full bg-transparent border-none text-5xl md:text-6xl font-light p-0 placeholder:text-gray-200 dark:placeholder:text-[#3a251e] focus:ring-0 text-slate-900 dark:text-white" />
                            <span className="text-text-secondary pb-3 text-lg font-medium">kg</span>
                        </div>
                    </div>

                    <div className="md:col-span-12 flex flex-col md:flex-row items-center justify-between gap-6 pt-4">
                        <div className="flex items-center gap-2 text-text-secondary text-sm">
                            <span className="material-symbols-outlined text-lg">lock</span>
                            <p>Tus datos son privados.</p>
                        </div>
                        <Link to="/onboarding/step2" className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white text-lg font-bold py-4 px-10 rounded-full shadow-[0_4px_20px_rgba(236,73,19,0.4)] flex items-center justify-center gap-3 transition-all">
                            Siguiente paso <span className="material-symbols-outlined">arrow_forward</span>
                        </Link>
                    </div>
                </form>
            </div>
        </main>
    </div>
  );
};

export default OnboardingStep1;