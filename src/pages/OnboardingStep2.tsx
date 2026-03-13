import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import logoUrl from '../assets/logo-fitness.png';

const OnboardingStep2: React.FC = () => {
  const { onboardingData, updateOnboardingData } = useStore();
  const [selectedGoal, setSelectedGoal] = useState<string>(
    onboardingData.mainGoal || 'Pérdida de Grasa'
  );
  const [selectedLevel, setSelectedLevel] = useState<string>(onboardingData.level || 'Intermedio');

  useEffect(() => {
    updateOnboardingData({ mainGoal: selectedGoal, level: selectedLevel });
  }, [selectedGoal, selectedLevel, updateOnboardingData]);

  const goals = [
    {
      name: 'Pérdida de Grasa',
      desc: 'Alta intensidad.',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA-f8MYfLkUZxxJzclPvV9M1NZ4NqN2mcEYYLZel1sugKL7K_3EKPgXhFf7_Ho5XlXIUAAqRs66I41Ki8FN83P_1d1ip-33T_p6nFpbRiHVCobgSZawKmj-qkNXKWsObEUfgMVXoNTjH37JFUTr0PaRs1U6tE5Y9GEYv223Ig8Lti1kS0EuLUV1OSqzv1txU58-OlUCGsXaCs-dT4ZF6MDmxtiX4p5ghP8LkhWQVAeJfxH_41GwD1v8tyjH-k2Y3k915NKiX36sHdA',
    },
    {
      name: 'Fuerza',
      desc: 'Hipertrofia y Potencia.',
      img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop',
    },
    {
      name: 'Movilidad',
      desc: 'Flexibilidad y Salud.',
      img: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=1470&auto=format&fit=crop',
    },
  ];

  const levels = ['Principiante', 'Intermedio', 'Atleta'];
  const progress = 50;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_24%),linear-gradient(180deg,_#07131d_0%,_#091826_38%,_#0b1724_100%)] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Fitness App" className="size-9 object-contain" />
            <div>
              <p className="text-sm font-semibold text-white">Fitness App</p>
              <p className="text-xs text-slate-400">Objetivos</p>
            </div>
          </div>
          <Link
            to="/onboarding/step1"
            className="text-sm font-medium text-slate-300 transition-colors hover:text-white"
          >
            Volver
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 pb-28 md:px-6">
        <section className="mobile-hero">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="mobile-kicker">Paso 2 de 4</div>
              <h1 className="mobile-title max-w-xl">Define el objetivo y el nivel del usuario</h1>
              <p className="mobile-subtitle max-w-2xl">
                Esta selección condiciona recomendaciones, expectativas de progreso y lenguaje de la
                experiencia.
              </p>
            </div>
            <div className="hidden rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-right md:block">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Progreso</p>
              <p className="mt-1 text-2xl font-semibold text-white">{progress}%</p>
            </div>
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400"
              style={{ width: `${progress}%` }}
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">flag</span>
            <h2 className="text-xl font-semibold text-white">Objetivo principal</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {goals.map((goal, i) => (
              <button
                type="button"
                key={i}
                onClick={() => setSelectedGoal(goal.name)}
                className={`mobile-card relative overflow-hidden text-left transition-all ${
                  selectedGoal === goal.name
                    ? 'border-primary/70 bg-white/[0.09]'
                    : 'hover:border-white/15'
                }`}
              >
                {selectedGoal === goal.name && (
                  <div className="absolute right-4 top-4 flex size-7 items-center justify-center rounded-full bg-primary text-white">
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  </div>
                )}
                <div
                  className={`mb-4 h-36 rounded-2xl bg-cover bg-center ${
                    selectedGoal !== goal.name ? 'grayscale-[0.15]' : ''
                  }`}
                  style={{ backgroundImage: `url("${goal.img}")` }}
                />
                <p className="text-lg font-semibold text-white">{goal.name}</p>
                <p className="mt-1 text-sm text-slate-300">{goal.desc}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="mobile-card space-y-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">equalizer</span>
            <h2 className="text-xl font-semibold text-white">Nivel actual</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {levels.map((level) => (
              <button
                type="button"
                key={level}
                onClick={() => setSelectedLevel(level)}
                className={`rounded-2xl px-4 py-5 text-sm font-semibold transition-all ${
                  selectedLevel === level
                    ? 'bg-primary text-white'
                    : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </section>

        <div className="fixed inset-x-4 bottom-4 z-30 md:static md:inset-auto">
          <Link
            to="/home"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-base font-semibold text-white shadow-[0_16px_40px_rgba(236,73,19,0.28)] transition-transform hover:scale-[1.01] md:w-auto"
          >
            Siguiente paso
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default OnboardingStep2;
