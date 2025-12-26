import React from 'react';
import { Link } from 'react-router-dom';

const AppGuide: React.FC = () => {
    return (
        <div className="h-full w-full overflow-y-auto p-4 md:p-8">
            <div className="max-w-4xl mx-auto pb-20">
                {/* Hero Section */}
                <div className="text-center mb-12">
                    <h1 className="text-3xl md:text-5xl font-black mb-4">
                        Bienvenido a <span className="text-primary">Fitness App</span>
                    </h1>
                    <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
                        Tu compañero personal de entrenamiento. Aquí tienes una guía rápida de todo lo que puedes hacer para alcanzar tus objetivos.
                    </p>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Routines */}
                    <div className="bg-white dark:bg-[#1a2632] border border-gray-200 dark:border-[#233648] rounded-2xl p-6 hover:shadow-lg transition-all">
                        <div className="size-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-3xl">fitness_center</span>
                        </div>
                        <h3 className="text-xl font-bold mb-2">Rutinas Personalizadas</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                            Crea y organiza tus propias rutinas de entrenamiento. Selecciona ejercicios de nuestra biblioteca, define series, repeticiones y pesos.
                        </p>
                        <Link to="/routine" className="text-primary font-bold hover:underline">Ir a Rutinas →</Link>
                    </div>

                    {/* Workout Mode */}
                    <div className="bg-white dark:bg-[#1a2632] border border-gray-200 dark:border-[#233648] rounded-2xl p-6 hover:shadow-lg transition-all">
                        <div className="size-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-3xl">timer</span>
                        </div>
                        <h3 className="text-xl font-bold mb-2">Modo Entrenamiento</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                            Lleva el seguimiento en tiempo real. Cronómetro de descanso automático, registro de series completadas y ajuste de pesos sobre la marcha.
                        </p>
                        <Link to="/routine" className="text-primary font-bold hover:underline">Empezar ahora →</Link>
                    </div>

                    {/* Statistics */}
                    <div className="bg-white dark:bg-[#1a2632] border border-gray-200 dark:border-[#233648] rounded-2xl p-6 hover:shadow-lg transition-all">
                        <div className="size-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-3xl">equalizer</span>
                        </div>
                        <h3 className="text-xl font-bold mb-2">Estadísticas y Progreso</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                            Visualiza tu evolución. Gráficos de volumen de carga, frecuencia de entrenamientos y mejoras en tus levantamientos clave.
                        </p>
                        <Link to="/dashboard" className="text-primary font-bold hover:underline">Ver Estadísticas →</Link>
                    </div>

                    {/* Achievements */}
                    <div className="bg-white dark:bg-[#1a2632] border border-gray-200 dark:border-[#233648] rounded-2xl p-6 hover:shadow-lg transition-all">
                        <div className="size-12 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-3xl">emoji_events</span>
                        </div>
                        <h3 className="text-xl font-bold mb-2">Logros y Metas</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                            Desbloquea medallas al mantener la constancia y superar tus récords personales. ¡Mantén la motivación alta!
                        </p>
                        <Link to="/achievements" className="text-primary font-bold hover:underline">Ver Logros →</Link>
                    </div>
                </div>

                {/* Getting Started Tip */}
                <div className="mt-12 p-6 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 text-white shadow-xl">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="size-16 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-3xl text-primary">lightbulb</span>
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h3 className="text-xl font-bold mb-2">¿Cómo empezar?</h3>
                            <p className="text-gray-300">
                                Ve a la sección de <strong>Rutinas</strong> y crea tu primera rutina personalizada con el botón "+ Nueva Rutina". ¡Es el primer paso para transformar tu cuerpo!
                            </p>
                        </div>
                        <Link
                            to="/routine/new"
                            className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-transform hover:scale-105"
                        >
                            Crear Rutina
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AppGuide;
