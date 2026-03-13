import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import logoUrl from '../assets/logo-fitness.png';
import { useStore } from '../store/useStore';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const resetUserScopedState = useStore((state) => state.resetUserScopedState);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (authMode === 'register') {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        if (
          error.message.includes('User already registered') ||
          error.message.includes('already registered')
        ) {
          setMessage({
            type: 'error',
            text: 'Este correo ya está registrado. Por favor inicia sesión.',
          });
        } else {
          setMessage({ type: 'error', text: error.message });
        }
      } else {
        setMessage({ type: 'success', text: '¡Bienvenido! Redirigiendo...' });
        setTimeout(() => {
          navigate('/onboarding/step1');
        }, 1000);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage({ type: 'error', text: 'Credenciales inválidas o error de conexión.' });
      } else {
        navigate('/home');
      }
    }

    setLoading(false);
  };

  const handleGuestMode = async () => {
    setLoading(true);
    setMessage(null);
    await supabase.auth.signOut();
    resetUserScopedState();
    navigate('/onboarding/step1');
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(236,73,19,0.14),_transparent_24%),linear-gradient(180deg,_#050d15_0%,_#081521_45%,_#0b1724_100%)] text-white">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <img src={logoUrl} alt="Fitness App" className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Fitness App</p>
              <p className="text-xs text-slate-400">Entrena con claridad</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 gap-6 px-4 pb-8 pt-24 md:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-slate-950/50 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.32)] backdrop-blur-xl md:p-8 lg:p-10">
          <div className="absolute inset-0">
            <img
              alt="Man sprinting in dark gym"
              className="h-full w-full object-cover opacity-35"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAxkpKuBcCSOZO7Sbhx86Jo_DkY9YnfJdF9XV1vdX6pzrqao8Snrsn2xZIF_uhQBcD7iQ3LM6f1eLDkjQtDcGlebAW0LFTOVJ_O6oNHdPIwU7Vg0HjbxvSEO5SwbdkY-_4r9lEIj1th9Bj-8ZGBsf6iYyplD22jt6Mg0qd9hF-GM9vgmI5z1iDNT-XaLV-N53E7kH1_mEgc1VAzFpp9ZHUsPp0_mvJ6pEyudYJ3AmeUI0r5DbEQBYxbuaUOtM8cDqaVhT1hm_0r8w"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,8,13,0.2),rgba(3,8,13,0.72))]" />
          </div>

          <div className="relative z-10 flex h-full flex-col justify-between gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Mobile first
              </div>
              <h1 className="max-w-xl text-4xl font-semibold leading-tight text-white md:text-6xl">
                Revoluciona tu <span className="text-primary">rendimiento</span> con datos.
              </h1>
              <p className="max-w-lg text-base leading-7 text-slate-300 md:text-lg">
                Controla rutinas, sesiones, progreso y recuperación con una interfaz mucho más clara
                para el usuario móvil.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Rutinas</p>
                <p className="mt-2 text-2xl font-semibold text-white">Flexibles</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Sesiones</p>
                <p className="mt-2 text-2xl font-semibold text-white">Guiadas</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Métricas</p>
                <p className="mt-2 text-2xl font-semibold text-white">Accionables</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[36px] border border-white/10 bg-[#0c1d2b]/88 p-5 shadow-[0_30px_80px_rgba(0,0,0,0.32)] backdrop-blur-xl md:p-7">
          <div className="mb-6 flex rounded-full border border-white/10 bg-white/5 p-1">
            <button
              onClick={() => setAuthMode('register')}
              className={`flex-1 rounded-full py-3 text-sm font-semibold transition-all ${
                authMode === 'register'
                  ? 'bg-white text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Crear cuenta
            </button>
            <button
              onClick={() => setAuthMode('login')}
              className={`flex-1 rounded-full py-3 text-sm font-semibold transition-all ${
                authMode === 'login' ? 'bg-white text-slate-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              Iniciar sesión
            </button>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-semibold text-white">
              {authMode === 'register' ? 'Crea tu cuenta' : 'Bienvenido de nuevo'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {authMode === 'register'
                ? 'Empieza con el onboarding y deja la experiencia ajustada al usuario.'
                : 'Accede a tu panel y continúa donde lo dejaste.'}
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">Correo electrónico</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <span className="material-symbols-outlined text-[20px] text-slate-500">mail</span>
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="block w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 pl-11 pr-4 text-white placeholder:text-slate-500 outline-none transition-colors focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">Contraseña</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <span className="material-symbols-outlined text-[20px] text-slate-500">lock</span>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  className="block w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 pl-11 pr-4 text-white placeholder:text-slate-500 outline-none transition-colors focus:border-primary"
                />
              </div>
            </div>

            {message && (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  message.type === 'error'
                    ? 'border-red-500/25 bg-red-500/10 text-red-200'
                    : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
                }`}
              >
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-4 text-sm font-semibold text-white transition-transform hover:scale-[1.01] disabled:opacity-70"
            >
              {loading
                ? 'Procesando...'
                : authMode === 'register'
                  ? 'Crear cuenta'
                  : 'Iniciar sesión'}
            </button>
          </form>

          <div className="mt-6 border-t border-white/10 pt-6 text-center">
            <p className="mb-4 text-sm text-slate-400">¿Solo quieres echar un vistazo?</p>
            <button
              type="button"
              onClick={handleGuestMode}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-200 transition-colors hover:border-primary hover:text-white"
            >
              Continuar como invitado
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LandingPage;
