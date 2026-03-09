import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabaseClient';
import { ActiveWorkoutFooter } from './ActiveWorkoutFooter';
import PRNotification from './PRNotification';
import MobileNav from './MobileNav';
import logoUrl from '../assets/logo-fitness.png';
import { applyTheme, initTheme, ThemeMode } from '../lib/theme';

const getPageMeta = (pathname: string) => {
  if (pathname.includes('/home')) {
    return { title: 'Inicio', subtitle: 'Todo tu progreso en un vistazo' };
  }
  if (pathname.includes('/routine/new')) {
    return { title: 'Nueva Rutina', subtitle: 'Crea un plan claro y reutilizable' };
  }
  if (pathname.includes('/routine/edit')) {
    return { title: 'Editar Rutina', subtitle: 'Ajusta estructura, descansos y orden' };
  }
  if (pathname.includes('/routine') && pathname.includes('/workout')) {
    return { title: 'Entrenando', subtitle: 'Mantén el ritmo y registra cada serie' };
  }
  if (pathname.includes('/routine')) {
    return { title: 'Rutinas', subtitle: 'Organiza tus planes y carpetas' };
  }
  if (pathname.includes('/dashboard')) {
    return { title: 'Estadísticas', subtitle: 'Lectura rápida de tu rendimiento' };
  }
  if (pathname.includes('/progress')) {
    return { title: 'Progreso', subtitle: 'Medidas, evolución y cuerpo' };
  }
  if (pathname.includes('/pr')) {
    return { title: 'PRs', subtitle: 'Tus mejores marcas' };
  }
  if (pathname.includes('/exercises/new')) {
    return { title: 'Nuevo Ejercicio', subtitle: 'Añade un movimiento a tu biblioteca' };
  }
  if (pathname.includes('/exercises') && pathname.includes('/edit')) {
    return { title: 'Editar Ejercicio', subtitle: 'Actualiza datos e instrucciones' };
  }
  if (pathname.includes('/exercises')) {
    return { title: 'Ejercicios', subtitle: 'Biblioteca personal y base común' };
  }
  if (pathname.includes('/history')) {
    return { title: 'Historial', subtitle: 'Entrenos pasados y detalle' };
  }
  if (pathname.includes('/settings')) {
    return { title: 'Configuración', subtitle: 'Cuenta, notificaciones y seguridad' };
  }
  if (pathname.includes('/profile-data')) {
    return { title: 'Perfil', subtitle: 'Tus datos y objetivos actuales' };
  }
  if (pathname.includes('/guide')) {
    return { title: 'Guía', subtitle: 'Cómo sacar más partido a la app' };
  }
  return { title: 'Fitness App', subtitle: 'Entrena con estructura' };
};

const MainLayout: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { loadActiveWorkout } = useStore();
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const isKeyboardOpen = keyboardInset > 0;
  const pageMeta = getPageMeta(pathname);

  useEffect(() => {
    void loadActiveWorkout();
  }, [loadActiveWorkout]);

  useEffect(() => {
    const resolvedTheme = initTheme();
    setTheme(resolvedTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  useEffect(() => {
    const updateKeyboardInset = () => {
      const viewport = window.visualViewport;
      const viewportHeight = viewport?.height ?? window.innerHeight;
      const offsetTop = viewport?.offsetTop ?? 0;
      const inset = Math.max(0, window.innerHeight - viewportHeight - offsetTop);
      setKeyboardInset(inset);
      document.documentElement.style.setProperty('--keyboard-inset', `${inset}px`);
    };

    const handleFocusIn = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (
        !(
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement
        )
      ) {
        return;
      }

      setTimeout(() => {
        target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 220);
    };

    updateKeyboardInset();

    const viewport = window.visualViewport;
    if (viewport) {
      viewport.addEventListener('resize', updateKeyboardInset);
      viewport.addEventListener('scroll', updateKeyboardInset);
    } else {
      window.addEventListener('resize', updateKeyboardInset);
    }
    document.addEventListener('focusin', handleFocusIn, true);

    return () => {
      if (viewport) {
        viewport.removeEventListener('resize', updateKeyboardInset);
        viewport.removeEventListener('scroll', updateKeyboardInset);
      } else {
        window.removeEventListener('resize', updateKeyboardInset);
      }
      document.removeEventListener('focusin', handleFocusIn, true);
      document.documentElement.style.setProperty('--keyboard-inset', '0px');
    };
  }, []);

  const navItems = [
    { path: '/home', label: 'Inicio', icon: 'home' },
    { path: '/dashboard', label: 'Estadísticas', icon: 'bar_chart' },
    { path: '/routine', label: 'Rutinas', icon: 'fitness_center' },
    { path: '/pr', label: 'PR', icon: 'military_tech' },
    { path: '/exercises', label: 'Ejercicios', icon: 'list_alt' },
    { path: '/progress', label: 'Progreso', icon: 'accessibility_new' },
    { path: '/history', label: 'Historial', icon: 'history' },
  ];

  const hideBottomNav =
    pathname.includes('/workout') ||
    pathname.includes('/routine/new') ||
    pathname.includes('/routine/edit') ||
    pathname.includes('/exercises/new') ||
    (pathname.includes('/exercises/') && pathname.includes('/edit'));
  const mainPadding = hideBottomNav
    ? 'pb-0'
    : 'pb-[calc(92px+env(safe-area-inset-bottom)+var(--keyboard-inset,0px))] md:pb-0';

  return (
    <div className="flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden bg-background-dark text-slate-100 font-display">
      <PRNotification />

      <header className="hidden shrink-0 items-center justify-between border-b border-[rgba(73,133,214,0.18)] bg-[rgba(11,21,33,0.9)] px-8 py-4 backdrop-blur-md md:flex">
        <NavLink to="/home" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#2f8cff] to-[#1e6de5] text-white shadow-lg shadow-[#2f8cff]/20">
            <img src={logoUrl} alt="Fitness App" className="h-full w-full object-contain" />
          </div>
          <span className="text-xl font-bold tracking-tight">Fitness App</span>
        </NavLink>

        <nav className="flex items-center gap-2 rounded-full border border-[rgba(73,133,214,0.14)] bg-[rgba(16,31,50,0.78)] p-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={(navData) =>
                `flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold transition-all ${
                  navData.isActive
                    ? 'bg-[rgba(47,140,255,0.14)] text-[#4ea0ff] shadow-sm'
                    : 'text-slate-400 hover:text-slate-100'
                }`
              }
            >
              <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="flex size-10 items-center justify-center rounded-full border border-[rgba(73,133,214,0.16)] bg-[rgba(17,31,48,0.86)] transition-colors"
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            <span className="material-symbols-outlined text-[22px] text-slate-100">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
          <ProfileDropdown />
        </div>
      </header>

      <header className="shrink-0 border-b border-[rgba(73,133,214,0.12)] bg-[rgba(6,14,24,0.88)] backdrop-blur-xl md:hidden">
        <div className="mx-auto flex w-full max-w-md items-center justify-between px-4 pb-3 pt-[max(0.9rem,env(safe-area-inset-top))]">
          <button
            onClick={() => {
              if (window.history.length > 1 && !pathname.includes('/home')) {
                navigate(-1);
                return;
              }
              navigate('/home');
            }}
            className="flex size-10 items-center justify-center rounded-full border border-[rgba(73,133,214,0.16)] bg-[rgba(17,31,48,0.86)] text-slate-200"
            aria-label="Volver"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>

          <div className="min-w-0 flex-1 px-3 text-center">
            <p className="truncate text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[#4ea0ff]">
              {pageMeta.subtitle}
            </p>
            <h1 className="truncate text-[1.15rem] font-bold text-white">{pageMeta.title}</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="flex size-10 items-center justify-center rounded-full border border-[rgba(73,133,214,0.16)] bg-[rgba(17,31,48,0.86)] transition-colors"
              aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              <span className="material-symbols-outlined text-[20px] text-slate-100">
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
            <ProfileDropdown />
          </div>
        </div>
      </header>

      <main className={`mobile-screen flex-1 min-h-0 overflow-hidden ${mainPadding}`}>
        <Outlet />
      </main>

      {!pathname.includes('/workout') && !isKeyboardOpen && <ActiveWorkoutFooter />}
      {!hideBottomNav && !isKeyboardOpen && <MobileNav />}
    </div>
  );
};

const ProfileDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { userData, loadUserData } = useStore();

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const displayName =
    userData?.user_metadata?.full_name || userData?.email?.split('@')[0] || 'Usuario';
  const displayEmail = userData?.email || 'Modo Invitado';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex size-10 items-center justify-center overflow-hidden rounded-full border border-[rgba(73,133,214,0.2)] bg-[rgba(17,31,48,0.86)] text-white font-bold transition-transform hover:scale-105 active:scale-95"
      >
        <img
          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`}
          alt="Profile"
          className="h-full w-full object-cover"
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-[1.35rem] border border-[rgba(73,133,214,0.16)] bg-[rgba(10,20,34,0.98)] shadow-2xl">
          <div className="border-b border-[rgba(73,133,214,0.1)] p-4">
            <div className="flex items-center gap-3">
              <img
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`}
                alt="Profile"
                className="size-11 rounded-full"
              />
              <div className="overflow-hidden">
                <p className="truncate text-sm font-bold text-white">{displayName}</p>
                <p className="truncate text-xs text-slate-400">{displayEmail}</p>
              </div>
            </div>
          </div>

          <div className="p-2">
            <NavLink
              to="/profile-data"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-[rgba(47,140,255,0.08)]"
            >
              <span className="material-symbols-outlined text-[20px] text-slate-400">
                assignment_ind
              </span>
              <span className="text-sm font-medium text-white">Mis Datos</span>
            </NavLink>

            <NavLink
              to="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-[rgba(47,140,255,0.08)]"
            >
              <span className="material-symbols-outlined text-[20px] text-slate-400">
                settings
              </span>
              <span className="text-sm font-medium text-white">Configuración</span>
            </NavLink>

            <NavLink
              to="/guide"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-[rgba(47,140,255,0.08)]"
            >
              <span className="material-symbols-outlined text-[20px] text-slate-400">help</span>
              <span className="text-sm font-medium text-white">Ayuda</span>
            </NavLink>
          </div>

          <div className="border-t border-[rgba(73,133,214,0.1)] p-2">
            <button
              onClick={async () => {
                setIsOpen(false);
                await supabase.auth.signOut();
                window.location.href = '/';
              }}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-red-400 transition-colors hover:bg-red-500/10"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
              <span className="text-sm font-medium">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainLayout;
