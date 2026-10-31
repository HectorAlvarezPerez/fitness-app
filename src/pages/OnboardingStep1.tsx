import React from 'react';
import { Link } from 'react-router-dom';
import logoUrl from '../assets/logo-fitness.png';

const OnboardingStep1: React.FC = () => {
  const progress = 25;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.12),_transparent_26%),linear-gradient(180deg,_#07131d_0%,_#091826_38%,_#0b1724_100%)] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Fitness App" className="size-9 object-contain" />
            <div>
              <p className="text-sm font-semibold text-white">Fitness App</p>
              <p className="text-xs text-slate-400">Onboarding</p>
            </div>
          </div>
          <Link
            to="/"
            className="text-sm font-medium text-slate-300 transition-colors hover:text-white"
          >
            Inicio
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 pb-24 md:px-6">
        <section className="mobile-hero">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="mobile-kicker">Paso 1 de 4</div>
              <h1 className="mobile-title max-w-xl">Vamos a definir tu punto de partida</h1>
              <p className="mobile-subtitle max-w-2xl">
                Recogemos solo lo justo para personalizar el entrenamiento, los cálculos y la
                experiencia dentro del dashboard.
              </p>
            </div>
            <div className="hidden rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-right md:block">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Progreso</p>
              <p className="mt-1 text-2xl font-semibold text-white">{progress}%</p>
            </div>
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400"
              style={{ width: `${progress}%` }}
            />
          </div>
        </section>

        <form className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <section className="mobile-card md:col-span-12">
            <label className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
              <span className="material-symbols-outlined text-primary">wc</span>
              Género biológico
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {['Hombre', 'Mujer', 'Otro'].map((g) => (
                <label key={g} className="cursor-pointer">
                  <input type="radio" name="gender" className="peer sr-only" />
                  <div className="flex h-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm font-medium text-slate-300 transition-all peer-checked:border-primary peer-checked:bg-primary/15 peer-checked:text-white hover:bg-white/10">
                    {g}
                  </div>
                </label>
              ))}
            </div>
          </section>

          <section className="mobile-card md:col-span-4">
            <label className="mb-4 flex items-center gap-2 text-base font-semibold text-white">
              <span className="material-symbols-outlined text-primary">cake</span>
              Edad
            </label>
            <div className="flex items-end gap-3">
              <input
                type="number"
                placeholder="25"
                className="w-full border-none bg-transparent p-0 text-5xl font-light text-white placeholder:text-slate-700 focus:ring-0"
              />
              <span className="pb-2 text-sm font-medium text-slate-400">años</span>
            </div>
          </section>

          <section className="mobile-card md:col-span-4">
            <label className="mb-4 flex items-center gap-2 text-base font-semibold text-white">
              <span className="material-symbols-outlined text-primary">height</span>
              Altura
            </label>
            <div className="flex items-end gap-3">
              <input
                type="number"
                placeholder="175"
                className="w-full border-none bg-transparent p-0 text-5xl font-light text-white placeholder:text-slate-700 focus:ring-0"
              />
              <span className="pb-2 text-sm font-medium text-slate-400">cm</span>
            </div>
          </section>

          <section className="mobile-card md:col-span-4">
            <label className="mb-4 flex items-center gap-2 text-base font-semibold text-white">
              <span className="material-symbols-outlined text-primary">monitor_weight</span>
              Peso
            </label>
            <div className="flex items-end gap-3">
              <input
                type="number"
                placeholder="70"
                className="w-full border-none bg-transparent p-0 text-5xl font-light text-white placeholder:text-slate-700 focus:ring-0"
              />
              <span className="pb-2 text-sm font-medium text-slate-400">kg</span>
            </div>
          </section>

          <div className="md:col-span-12 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200">
              <span className="material-symbols-outlined text-[18px]">lock</span>
              Tus datos se usan solo para personalizar la experiencia.
            </div>
            <Link
              to="/onboarding/step2"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-base font-semibold text-white transition-transform hover:scale-[1.01] md:w-auto"
            >
              Siguiente paso
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
};

export default OnboardingStep1;
