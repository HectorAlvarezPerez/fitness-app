import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import logoUrl from '../assets/logo-fitness.png';
import { useStore } from '../store/useStore';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

// Build with VITE_ALLOW_SIGNUP=false to hide account creation (the backend must also block it).
const SIGNUP_ENABLED = import.meta.env.VITE_ALLOW_SIGNUP !== 'false';

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
        navigate('/home', { replace: true });
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <img src={logoUrl} alt="Fitness App" className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Fitness App</p>
              <p className="text-xs text-slate-500">Entrena con claridad</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 pb-8 pt-24 md:px-6">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm backdrop-blur-xl md:p-7">
          <div className="mb-6 flex rounded-full border border-slate-200 bg-slate-50 p-1">
            {SIGNUP_ENABLED && (
              <Button variant="ghost"
                onClick={() => setAuthMode('register')}
                className={`flex-1 rounded-full py-3 text-sm font-semibold transition-all ${
                  authMode === 'register'
                    ? 'bg-white text-slate-950'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Crear cuenta
              </Button>
            )}
            <Button variant="ghost"
              onClick={() => setAuthMode('login')}
              className={`flex-1 rounded-full py-3 text-sm font-semibold transition-all ${
                authMode === 'login' ? 'bg-white text-slate-950' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Iniciar sesión
            </Button>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-semibold text-slate-900">
              {authMode === 'register' ? 'Crea tu cuenta' : 'Bienvenido de nuevo'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {authMode === 'register'
                ? 'Empieza con el onboarding y deja la experiencia ajustada al usuario.'
                : 'Accede a tu panel y continúa donde lo dejaste.'}
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-600">Correo electrónico</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <span className="material-symbols-outlined text-[20px] text-slate-500">mail</span>
                </div>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="block w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-slate-900 placeholder:text-slate-500 outline-none transition-colors focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-600">Contraseña</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <span className="material-symbols-outlined text-[20px] text-slate-500">lock</span>
                </div>
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  className="block w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-slate-900 placeholder:text-slate-500 outline-none transition-colors focus:border-primary"
                />
              </div>
            </div>

            {message && (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  message.type === 'error'
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                }`}
              >
                {message.text}
              </div>
            )}

            <Button
              variant="default"
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-4 text-sm font-semibold text-white transition-transform hover:scale-[1.01] disabled:opacity-70"
            >
              {loading
                ? 'Procesando...'
                : authMode === 'register'
                  ? 'Crear cuenta'
                  : 'Iniciar sesión'}
            </Button>
          </form>

          <div className="mt-6 border-t border-slate-200 pt-6 text-center">
            <p className="mb-4 text-sm text-slate-500">¿Solo quieres echar un vistazo?</p>
            <Button variant="ghost"
              type="button"
              onClick={handleGuestMode}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-primary hover:text-slate-900"
            >
              Continuar como invitado
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LandingPage;
