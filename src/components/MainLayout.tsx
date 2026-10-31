import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabaseClient';
import { ActiveWorkoutFooter } from './ActiveWorkoutFooter';
import PRNotification from './PRNotification';
import MobileNav from './MobileNav';
import logoUrl from '../assets/logo-fitness.png';
import { initTheme } from '../lib/theme';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';

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
  if (pathname.includes('/profile-data')) {
    return { title: 'Perfil', subtitle: 'Tus datos y objetivos actuales' };
  }
  if (pathname === '/pr' || pathname.startsWith('/pr/')) {
    return { title: 'PRs', subtitle: 'Tus mejores marcas' };
  }
  if (pathname === '/exercises/new') {
    return { title: 'Nuevo Ejercicio', subtitle: 'Añade un movimiento a tu biblioteca' };
  }
  if (pathname.startsWith('/exercises/') && pathname.endsWith('/edit')) {
    return { title: 'Editar Ejercicio', subtitle: 'Actualiza datos e instrucciones' };
  }
  if (pathname === '/exercises' || pathname.startsWith('/exercises/')) {
    return { title: 'Ejercicios', subtitle: 'Biblioteca personal y base común' };
  }
  if (pathname.includes('/history')) {
    return { title: 'Historial', subtitle: 'Entrenos pasados y detalle' };
  }
  if (pathname.includes('/settings')) {
    return { title: 'Configuración', subtitle: 'Cuenta, notificaciones y seguridad' };
  }
  if (pathname.includes('/guide')) {
    return { title: 'Guía', subtitle: 'Cómo sacar más partido a la app' };
  }
  return { title: 'Fitness App', subtitle: 'Entrena con estructura' };
};

const MainLayout: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { activeWorkout, loadActiveWorkout } = useStore();
  const [keyboardInset, setKeyboardInset] = useState(0);
  const isKeyboardOpen = keyboardInset > 0;
  const pageMeta = getPageMeta(pathname);

  useEffect(() => {
    void loadActiveWorkout();
  }, [loadActiveWorkout]);

  useEffect(() => {
    initTheme();
  }, []);

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
  return (
    <div className="flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden bg-white text-slate-900 font-display">
      <PRNotification />

      <header className="hidden shrink-0 items-center justify-between border-b border-slate-200 bg-white px-8 py-4 md:flex">
        <NavLink to="/home" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-blue-50">
            <img src={logoUrl} alt="Fitness App" className="h-full w-full object-contain" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">Fitness App</span>
        </NavLink>

        <nav className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={(navData) =>
                `flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  navData.isActive
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`
              }
            >
              <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ProfileDropdown />
        </div>
      </header>

      <header className="shrink-0 border-b border-slate-200 bg-white md:hidden">
        <div className="mx-auto flex w-full max-w-md items-center justify-between px-4 pb-3 pt-[max(0.9rem,env(safe-area-inset-top))]">
          {[
            '/home',
            '/routine',
            '/dashboard',
            '/history',
            '/pr',
            '/exercises',
            '/progress',
          ].includes(pathname) ? (
            <div className="size-10 shrink-0" aria-hidden="true" />
          ) : (
            <Button variant="outline"
              type="button"
              size="icon"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                  return;
                }
                navigate('/home');
              }}
              className="rounded-full border-slate-200 bg-white text-slate-700"
              aria-label="Volver"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </Button>
          )}

          <div className="min-w-0 flex-1 px-3 text-center">
            <h1 className="truncate text-[1.05rem] font-semibold text-slate-900">{pageMeta.title}</h1>
          </div>

          <div className="flex items-center gap-2">
            <ProfileDropdown />
          </div>
        </div>
      </header>

      <main
        className="mobile-screen flex-1 min-h-0 overflow-hidden"
        data-active-workout={activeWorkout ? 'true' : 'false'}
      >
        <Outlet />
      </main>

      {!pathname.includes('/workout') && !isKeyboardOpen && <ActiveWorkoutFooter />}
      {!hideBottomNav && !isKeyboardOpen && <MobileNav />}
    </div>
  );
};

const ProfileDropdown: React.FC = () => {
  const { userData, loadUserData } = useStore();

  useEffect(() => {
    loadUserData();
  }, []);

  const displayName =
    userData?.user_metadata?.full_name || userData?.email?.split('@')[0] || 'Usuario';
  const displayEmail = userData?.email || 'Modo Invitado';
  const previewInitial = displayName.trim().charAt(0).toLocaleUpperCase('es') || 'U';
  const isPreviewHarness = window.location.pathname === '/preview.html';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Abrir menú de ${displayName}`}
          className="overflow-hidden rounded-full border border-slate-200 bg-slate-100 p-0 font-bold transition-transform hover:scale-105 active:scale-95"
        >
          {isPreviewHarness ? (
            <span aria-hidden="true" className="flex size-full items-center justify-center text-slate-700">
              {previewInitial}
            </span>
          ) : (
            <img
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`}
              alt=""
              className="h-full w-full object-cover"
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="p-3">
          <div className="flex items-center gap-3">
            {isPreviewHarness ? (
              <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blue-50 font-semibold text-blue-700">
                {previewInitial}
              </span>
            ) : (
              <img
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`}
                alt=""
                className="size-11 shrink-0 rounded-full"
              />
            )}
            <div className="min-w-0 overflow-hidden">
              <p className="truncate text-sm font-bold text-slate-900">{displayName}</p>
              <p className="truncate text-xs font-normal text-slate-500">{displayEmail}</p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <NavLink to="/profile-data">
            <span className="material-symbols-outlined text-[20px] text-slate-500">assignment_ind</span>
            Mis Datos
          </NavLink>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <NavLink to="/settings">
            <span className="material-symbols-outlined text-[20px] text-slate-500">settings</span>
            Configuración
          </NavLink>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <NavLink to="/guide">
            <span className="material-symbols-outlined text-[20px] text-slate-500">help</span>
            Ayuda
          </NavLink>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-red-700 focus:bg-red-50 focus:text-red-700"
          onSelect={async () => {
            await supabase.auth.signOut();
            window.location.href = '/';
          }}
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          Cerrar Sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default MainLayout;
