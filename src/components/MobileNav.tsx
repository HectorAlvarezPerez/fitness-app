import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Dumbbell,
  History,
  Home,
  ListChecks,
  MoreHorizontal,
  Settings,
  TrendingUp,
  Trophy,
  UserRound,
  X,
} from 'lucide-react';
import { Button } from './ui/button';

const primaryItems = [
  { path: '/home', label: 'Inicio', Icon: Home },
  { path: '/routine', label: 'Rutinas', Icon: Dumbbell },
  { path: '/history', label: 'Historial', Icon: History },
  { path: '/profile-data', label: 'Perfil', Icon: UserRound },
];

const moreItems = [
  { path: '/dashboard', label: 'Estadísticas', Icon: BarChart3 },
  { path: '/progress', label: 'Progreso', Icon: TrendingUp },
  { path: '/pr', label: 'PRs', Icon: Trophy },
  { path: '/exercises', label: 'Ejercicios', Icon: ListChecks },
  { path: '/settings', label: 'Ajustes', Icon: Settings },
];

const matchesPath = (pathname: string, path: string) =>
  pathname === path ||
  pathname.startsWith(path + '/') ||
  (path === '/routine' && pathname.includes('/routine'));

const MobileNav: React.FC = () => {
  const { pathname } = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const isMoreActive = moreItems.some((item) => matchesPath(pathname, item.path));

  useEffect(() => {
    if (!isOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isOpen]);

  return (
    <>
      {isOpen && (
        <Button variant="ghost"
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-slate-950/20 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-50 md:hidden">
        <div className="mx-auto max-w-lg px-2 pb-[max(0.35rem,env(safe-area-inset-bottom))]">
          {isOpen && (
            <div className="mb-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
              <div className="grid grid-cols-2 gap-1">
                {moreItems.map(({ path, label, Icon }) => {
                  const active = matchesPath(pathname, path);
                  return (
                    <NavLink
                      key={path}
                      to={path}
                      onClick={() => setIsOpen(false)}
                      className={`flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium ${
                        active ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden="true" />
                      <span>{label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-5 rounded-2xl border border-slate-200 bg-white/95 p-1 shadow-sm backdrop-blur">
            {primaryItems.map(({ path, label, Icon }) => {
              const active = matchesPath(pathname, path);
              return (
                <NavLink
                  key={path}
                  to={path}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-w-0 min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 text-[10px] font-medium leading-none ${
                    active ? 'text-blue-700' : 'text-slate-500'
                  }`}
                >
                  <span
                    className={`flex size-7 items-center justify-center rounded-lg ${
                      active ? 'bg-blue-50' : ''
                    }`}
                  >
                    <Icon className="size-[18px]" strokeWidth={active ? 2.4 : 1.9} aria-hidden="true" />
                  </span>
                  <span className="truncate">{label}</span>
                </NavLink>
              );
            })}
            <Button
              type="button"
              variant="ghost"
              className={`min-h-12 flex-col gap-0.5 rounded-xl px-0.5 text-[10px] font-medium ${
                isMoreActive || isOpen ? 'text-blue-700' : 'text-slate-500'
              }`}
              aria-expanded={isOpen}
              aria-label={isOpen ? 'Cerrar menú Más' : 'Abrir menú Más'}
              onClick={() => setIsOpen((current) => !current)}
            >
              {isOpen ? <X className="size-[18px]" /> : <MoreHorizontal className="size-[18px]" />}
              <span>Más</span>
            </Button>
          </div>
        </div>
      </nav>
    </>
  );
};

export default MobileNav;
