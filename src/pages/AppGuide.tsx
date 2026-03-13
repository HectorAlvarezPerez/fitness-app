import React from 'react';
import { Link } from 'react-router-dom';

const AppGuide: React.FC = () => {
  const sections = [
    {
      title: 'Rutinas Personalizadas',
      description:
        'Crea y organiza tus propias rutinas. Selecciona ejercicios, estructura bloques y deja listas tus sesiones.',
      icon: 'fitness_center',
      accent: 'bg-blue-500/15 text-blue-200',
      to: '/routine',
      cta: 'Ir a Rutinas',
    },
    {
      title: 'Modo Entrenamiento',
      description:
        'Registra series en tiempo real, cronometra descansos y ajusta pesos sobre la marcha sin salir del flujo.',
      icon: 'timer',
      accent: 'bg-amber-500/15 text-amber-200',
      to: '/routine',
      cta: 'Empezar ahora',
    },
    {
      title: 'Estadísticas y Progreso',
      description:
        'Consulta volumen, frecuencia y evolución para entender si tu entrenamiento realmente está avanzando.',
      icon: 'equalizer',
      accent: 'bg-cyan-500/15 text-cyan-200',
      to: '/dashboard',
      cta: 'Ver estadísticas',
    },
    {
      title: 'Récords Personales',
      description:
        'Detecta nuevas marcas y revisa tus mejores levantamientos para mantener una progresión clara.',
      icon: 'workspace_premium',
      accent: 'bg-emerald-500/15 text-emerald-200',
      to: '/dashboard',
      cta: 'Abrir panel',
    },
  ];

  return (
    <div className="mobile-page pb-28">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <section className="mobile-hero">
          <div className="mobile-kicker">Guía rápida</div>
          <h1 className="mobile-title max-w-xl">
            Todo lo que puedes hacer dentro de <span className="text-white">Fitness App</span>
          </h1>
          <p className="mobile-subtitle max-w-2xl">
            La app está pensada para que el usuario pueda crear, ejecutar y revisar su progreso
            desde el móvil sin perder contexto entre pantallas.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/routine/new"
              className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
            >
              Crear rutina
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white/88 transition-colors hover:bg-white/10"
            >
              Ver progreso
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {sections.map((section) => (
            <div key={section.title} className="mobile-card flex flex-col gap-4">
              <div
                className={`flex size-12 items-center justify-center rounded-2xl ${section.accent}`}
              >
                <span className="material-symbols-outlined text-[26px]">{section.icon}</span>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-white">{section.title}</h2>
                <p className="text-sm leading-6 text-slate-300">{section.description}</p>
              </div>
              <Link
                to={section.to}
                className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-primary"
              >
                {section.cta}
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            </div>
          ))}
        </section>

        <section className="mobile-card-soft flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <span className="material-symbols-outlined text-[28px]">lightbulb</span>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-white">Primer paso recomendado</h3>
              <p className="max-w-2xl text-sm leading-6 text-slate-300">
                Empieza por la sección de rutinas. Si el usuario entiende esa pantalla, el resto de
                la app se vuelve mucho más intuitivo porque todo el flujo gira alrededor de ella.
              </p>
            </div>
          </div>
          <Link
            to="/routine/new"
            className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-transform hover:scale-[1.02]"
          >
            Abrir creador
          </Link>
        </section>
      </div>
    </div>
  );
};

export default AppGuide;
