import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        if (authMode === 'register') {
            const { error } = await supabase.auth.signUp({
                email,
                password,
            });
            if (error) {
                if (error.message.includes('User already registered') || error.message.includes('already registered')) {
                    setMessage({ type: 'error', text: 'Este correo ya está registrado. Por favor inicia sesión.' });
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
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) {
                setMessage({ type: 'error', text: 'Credenciales inválidas o error de conexión.' });
            } else {
                navigate('/home');
            }
        }
        setLoading(false);
    };

    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden font-display bg-background-light dark:bg-background-dark text-slate-900 dark:text-white">
            {/* Navigation */}
            <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-6 md:px-12">
                <div className="flex items-center gap-3 text-white">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
                        <span className="material-symbols-outlined">health_metrics</span>
                    </div>
                    <h2 className="text-xl font-bold tracking-tight">Fitness App</h2>
                </div>
            </header>

            {/* Main Content Split Layout */}
            <main className="flex flex-1 flex-col lg:flex-row min-h-screen">
                {/* Left Side: Visual / Value Prop */}
                <div className="relative flex-1 lg:flex-[1.2] flex flex-col justify-end p-8 lg:p-20 bg-black overflow-hidden group">
                    {/* Background Image with Overlay */}
                    <div className="absolute inset-0 z-0">
                        <img
                            alt="Man sprinting in dark gym"
                            className="h-full w-full object-cover opacity-60 transition-transform duration-700 group-hover:scale-105"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAxkpKuBcCSOZO7Sbhx86Jo_DkY9YnfJdF9XV1vdX6pzrqao8Snrsn2xZIF_uhQBcD7iQ3LM6f1eLDkjQtDcGlebAW0LFTOVJ_O6oNHdPIwU7Vg0HjbxvSEO5SwbdkY-_4r9lEIj1th9Bj-8ZGBsf6iYyplD22jt6Mg0qd9hF-GM9vgmI5z1iDNT-XaLV-N53E7kH1_mEgc1VAzFpp9ZHUsPp0_mvJ6pEyudYJ3AmeUI0r5DbEQBYxbuaUOtM8cDqaVhT1hm_0r8w"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-background-dark/80"></div>
                        <div className="absolute inset-0 bg-gradient-to-r from-background-dark/80 via-transparent to-transparent"></div>
                    </div>

                    {/* Text Content */}
                    <div className="relative z-10 max-w-xl">
                        <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-white md:text-6xl mb-6">
                            Revoluciona tu <br /><span className="text-primary">rendimiento</span> con datos.
                        </h1>
                        <p className="text-lg text-slate-300 md:max-w-md leading-relaxed mb-8">
                            Fitness App utiliza biometría avanzada para adaptar cada repetición a tu cuerpo en tiempo real. Entrena más inteligente, no más duro.
                        </p>
                    </div>
                </div>

                {/* Right Side: Registration Form */}
                <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-20 bg-background-light dark:bg-[#1a0f0b]">
                    <div className="mx-auto w-full max-w-md">
                        {/* Mode Toggle */}
                        <div className="flex p-1 mb-8 bg-gray-100 dark:bg-[#2c1b15] rounded-xl">
                            <button
                                onClick={() => setAuthMode('register')}
                                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${authMode === 'register' ? 'bg-white dark:bg-[#482c23] shadow-sm text-primary' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                            >
                                Crear Cuenta
                            </button>
                            <button
                                onClick={() => setAuthMode('login')}
                                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${authMode === 'login' ? 'bg-white dark:bg-[#482c23] shadow-sm text-primary' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                            >
                                Iniciar Sesión
                            </button>
                        </div>

                        <div className="mb-10">
                            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                                {authMode === 'register' ? 'Crea tu cuenta' : 'Bienvenido de nuevo'}
                            </h2>
                            <p className="mt-2 text-slate-600 dark:text-slate-400">
                                {authMode === 'register' ? 'Comienza tu viaje fitness hoy mismo.' : 'Ingresa a tu panel de control.'}
                            </p>
                        </div>

                        {/* Removed FaceID Button */}

                        <div className="relative mb-8">
                            <div aria-hidden="true" className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                            </div>
                            <div className="relative flex justify-center text-sm font-medium leading-6">
                                <span className="bg-background-light px-6 text-slate-500 dark:bg-[#1a0f0b]">Ingresa tus credenciales</span>
                            </div>
                        </div>

                        <form className="space-y-5" onSubmit={handleLogin}>
                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Correo electrónico</label>
                                <div className="relative rounded-xl shadow-sm">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                        <span className="material-symbols-outlined text-slate-400 text-[20px]">mail</span>
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="tu@email.com"
                                        className="block w-full rounded-xl border-0 py-3.5 pl-11 pr-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary dark:bg-surface-dark dark:ring-slate-700 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-primary sm:text-sm sm:leading-6"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Contraseña</label>
                                <div className="relative rounded-xl shadow-sm">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                        <span className="material-symbols-outlined text-slate-400 text-[20px]">lock</span>
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        minLength={6}
                                        className="block w-full rounded-xl border-0 py-3.5 pl-11 pr-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary dark:bg-surface-dark dark:ring-slate-700 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-primary sm:text-sm sm:leading-6"
                                    />
                                </div>
                            </div>

                            {message && (
                                <div className={`p-3 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                    {message.text}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative flex w-full justify-center rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-primary/90 hover:shadow-primary/30 disabled:opacity-70"
                            >
                                <span className="absolute inset-y-0 left-0 flex items-center pl-5 opacity-0 transition-opacity group-hover:opacity-100">
                                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                                </span>
                                {loading ? 'Procesando...' : (authMode === 'register' ? 'Crear Cuenta' : 'Iniciar Sesión')}
                            </button>
                        </form>

                        {/* Guest Mode Section */}
                        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800 text-center">
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                ¿Solo quieres echar un vistazo?
                            </p>
                            <Link
                                to="/onboarding/step1"
                                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full border-2 border-gray-200 dark:border-gray-700 font-bold text-sm text-gray-600 dark:text-gray-300 hover:border-primary hover:text-primary transition-all"
                            >
                                <span>Continuar como invitado</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LandingPage;