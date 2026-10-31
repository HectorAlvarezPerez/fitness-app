import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabaseClient';
import logoUrl from '../assets/logo-fitness.png';
import { Button } from '../components/ui/button';

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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Fitness App" className="size-9 object-contain" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Fitness App</p>
              <p className="text-xs text-slate-500">Condiciones</p>
            </div>
          </div>
          <Link
            to="/onboarding/step2"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            Volver
          </Link>
        </div>
      </nav>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 pb-24 md:px-6">
        <section className="mobile-hero">
          <div className="space-y-2">
            <div className="mobile-kicker">Paso 3 de 4</div>
            <h1 className="mobile-title max-w-xl">Información adicional</h1>
            <p className="mobile-subtitle max-w-2xl">
              Selecciona lo que quieras guardar en tu perfil.
            </p>
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${progress}%` }}
            />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <section className="mobile-card lg:col-span-7">
            <div className="mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">medical_services</span>
              <h2 className="text-xl font-semibold text-slate-900">Condiciones médicas</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {['Ninguna', 'Asma', 'Diabetes', 'Lesión'].map((c) => (
                <Button
                  key={c}
                  variant="ghost"
                  type="button"
                  aria-pressed={selectedConditions.includes(c)}
                  onClick={() => toggleCondition(c)}
                  className={selectedConditions.includes(c)
                    ? 'min-h-11 rounded-full bg-primary px-5 text-sm font-medium text-white transition-all'
                    : 'min-h-11 rounded-full border border-slate-200 bg-slate-50 px-5 text-sm font-medium text-slate-600 transition-all hover:bg-slate-100'}
                >
                  {c}
                </Button>
              ))}
            </div>
          </section>

          <aside className="flex flex-col gap-4 lg:col-span-5">
            <div className="mobile-card flex flex-col gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Selección</p>
                <p className="mt-2 text-sm text-slate-900">{selectedConditions.join(', ')}</p>
              </div>
              <Button variant="ghost"
                onClick={handleConfirm}
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-base font-semibold text-white transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span>{loading ? 'Guardando...' : 'Confirmar y continuar'}</span>
                {!loading && (
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                )}
              </Button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default OnboardingStep3;
