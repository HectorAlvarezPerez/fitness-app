import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabaseClient';
import logoUrl from '../assets/logo-fitness.png';

const OnboardingStep3: React.FC = () => {
  const navigate = useNavigate();
  const { onboardingData, updateOnboardingData } = useStore();
  const [selectedConditions, setSelectedConditions] = useState<string[]>(
    onboardingData.conditions || ['Ninguna']
  );
  const [loading, setLoading] = useState(false);
  const progress = 75;

  const toggleCondition = (condition: string) => {
    let newConditions = [...selectedConditions];
    if (condition === 'Ninguna') {
      newConditions = ['Ninguna'];
    } else {
      if (newConditions.includes('Ninguna')) {
        newConditions = newConditions.filter((c) => c !== 'Ninguna');
      }
      if (newConditions.includes(condition)) {
        newConditions = newConditions.filter((c) => c !== condition);
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving profile:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),_transparent_26%),linear-gradient(180deg,_#07131d_0%,_#091826_38%,_#0b1724_100%)] text-white">
      <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Fitness App" className="size-9 object-contain" />
            <div>
              <p className="text-sm font-semibold text-white">Fitness App</p>
              <p className="text-xs text-slate-400">Condiciones</p>
            </div>
          </div>
          <Link
            to="/onboarding/step2"
            className="text-sm font-medium text-slate-300 transition-colors hover:text-white"
          >
            Volver
          </Link>
        </div>
      </nav>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 pb-24 md:px-6">
        <section className="mobile-hero">
          <div className="space-y-2">
            <div className="mobile-kicker">Paso 3 de 4</div>
            <h1 className="mobile-title max-w-xl">Último ajuste antes de entrar en la app</h1>
            <p className="mobile-subtitle max-w-2xl">
              Estas condiciones sirven para ajustar mensajes, recuperación y futuras
              recomendaciones, sin bloquear al usuario si prefiere no indicar nada.
            </p>
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2">
            <span className="material-symbols-outlined text-[18px] text-emerald-300">lock</span>
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">
              Datos encriptados
            </span>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <section className="mobile-card lg:col-span-7">
            <div className="mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">medical_services</span>
              <h2 className="text-xl font-semibold text-white">Condiciones médicas</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {['Ninguna', 'Asma', 'Diabetes', 'Lesión'].map((c) => (
                <label
                  key={c}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    toggleCondition(c);
                  }}
                >
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={selectedConditions.includes(c)}
                    readOnly
                  />
                  <div
                    className={`flex h-11 items-center justify-center rounded-full px-5 text-sm font-medium transition-all ${
                      selectedConditions.includes(c)
                        ? 'bg-primary text-white'
                        : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {c}
                  </div>
                </label>
              ))}
            </div>
          </section>

          <aside className="flex flex-col gap-4 lg:col-span-5">
            <div className="mobile-card-soft">
              <h3 className="text-lg font-semibold text-white">Por qué lo pedimos</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Fitness App usa esta información para matizar el contexto del usuario, no para
                bloquear funciones ni complicar el arranque.
              </p>
            </div>

            <div className="mobile-card flex flex-col gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Selección</p>
                <p className="mt-2 text-sm text-white">{selectedConditions.join(', ')}</p>
              </div>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-base font-semibold text-white transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span>{loading ? 'Guardando...' : 'Confirmar y continuar'}</span>
                {!loading && (
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                )}
              </button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default OnboardingStep3;
