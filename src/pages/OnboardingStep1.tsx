import React from 'react';
import { Link } from 'react-router-dom';
import logoUrl from '../assets/logo-fitness.png';
import { Input } from '../components/ui/input';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';

const OnboardingStep1: React.FC = () => {
  const progress = 25;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Fitness App" className="size-9 object-contain" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Fitness App</p>
              <p className="text-xs text-slate-500">Onboarding</p>
            </div>
          </div>
          <Link
            to="/"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
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
              <h1 className="mobile-title max-w-xl">Tus datos</h1>
              <p className="mobile-subtitle max-w-2xl">
                Completa tu perfil.
              </p>
            </div>
            <div className="hidden rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right md:block">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Progreso</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{progress}%</p>
            </div>
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${progress}%` }}
            />
          </div>
        </section>

        <form className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <section className="mobile-card md:col-span-12">
            <label className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
              <span className="material-symbols-outlined text-primary">wc</span>
              Género biológico
            </label>
            <RadioGroup
              name="gender"
              aria-label="Género biológico"
              className="grid grid-cols-1 gap-3 sm:grid-cols-3"
            >
              {['Hombre', 'Mujer', 'Otro'].map((g) => (
                <label key={g} className="cursor-pointer">
                  <RadioGroupItem value={g} className="peer sr-only" />
                  <span className="flex min-h-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-600 transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/15 peer-data-[state=checked]:text-slate-900 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2 hover:bg-slate-100">
                    {g}
                  </span>
                </label>
              ))}
            </RadioGroup>
          </section>

          <section className="mobile-card md:col-span-4">
            <label className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
              <span className="material-symbols-outlined text-primary">cake</span>
              Edad
            </label>
            <div className="flex items-end gap-3">
              <Input
                type="number"
                placeholder="25"
                className="h-auto min-h-11 w-full rounded-none border-none bg-transparent p-0 text-5xl font-light text-slate-900 placeholder:text-slate-700 focus:ring-0"
              />
              <span className="pb-2 text-sm font-medium text-slate-500">años</span>
            </div>
          </section>

          <section className="mobile-card md:col-span-4">
            <label className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
              <span className="material-symbols-outlined text-primary">height</span>
              Altura
            </label>
            <div className="flex items-end gap-3">
              <Input
                type="number"
                placeholder="175"
                className="h-auto min-h-11 w-full rounded-none border-none bg-transparent p-0 text-5xl font-light text-slate-900 placeholder:text-slate-700 focus:ring-0"
              />
              <span className="pb-2 text-sm font-medium text-slate-500">cm</span>
            </div>
          </section>

          <section className="mobile-card md:col-span-4">
            <label className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
              <span className="material-symbols-outlined text-primary">monitor_weight</span>
              Peso
            </label>
            <div className="flex items-end gap-3">
              <Input
                type="number"
                placeholder="70"
                className="h-auto min-h-11 w-full rounded-none border-none bg-transparent p-0 text-5xl font-light text-slate-900 placeholder:text-slate-700 focus:ring-0"
              />
              <span className="pb-2 text-sm font-medium text-slate-500">kg</span>
            </div>
          </section>

          <div className="md:col-span-12 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
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
