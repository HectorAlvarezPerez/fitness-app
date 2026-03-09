import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const primaryItems = [
  { path: '/home', label: 'Home', icon: 'home' },
  { path: '/routine', label: 'Rutinas', icon: 'format_list_bulleted' },
  { path: '/history', label: 'History', icon: 'history' },
  { path: '/profile-data', label: 'Perfil', icon: 'account_circle' },
];

const moreItems = [
  { path: '/dashboard', label: 'Stats', icon: 'bar_chart' },
  { path: '/progress', label: 'Progreso', icon: 'monitoring' },
  { path: '/pr', label: 'PRs', icon: 'military_tech' },
  { path: '/exercises', label: 'Ejercicios', icon: 'list_alt' },
  { path: '/settings', label: 'Ajustes', icon: 'settings' },
];

const matchesPath = (pathname: string, path: string) =>
  pathname === path || pathname.startsWith(path + '/') || (path === '/routine' && pathname.includes('/routine'));

const MobileNav: React.FC = () => {
  const { pathname } = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const isMoreActive = moreItems.some((item) => matchesPath(pathname, item.path));

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-[rgba(2,8,15,0.55)] backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="mx-auto max-w-md px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {isOpen && (
            <div className="mb-3 rounded-[1.4rem] border border-[rgba(73,133,214,0.16)] bg-[rgba(9,18,31,0.98)] p-2 shadow-2xl">
              {moreItems.map((item) => {
                const active = matchesPath(pathname, item.path);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors ${
                      active
                        ? 'bg-[rgba(47,140,255,0.12)] text-[#4ea0ff]'
                        : 'text-slate-200 hover:bg-[rgba(47,140,255,0.08)]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                    <span className="text-sm font-semibold">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          )}

          <div className="rounded-[1.75rem] border border-[rgba(73,133,214,0.16)] bg-[rgba(7,16,27,0.9)] px-2 py-2 shadow-[0_22px_44px_rgba(2,8,15,0.45)] backdrop-blur-xl">
            <div className="flex items-end justify-between">
              {primaryItems.map((item) => {
                const active = matchesPath(pathname, item.path);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className="group flex min-w-[4.6rem] flex-1 flex-col items-center gap-1 px-1 py-2"
                  >
                    <div
                      className={`relative flex h-11 w-11 items-center justify-center rounded-2xl transition-all ${
                        active ? 'bg-[rgba(47,140,255,0.14)]' : 'bg-transparent'
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined text-[22px] transition-all ${
                          active ? 'text-[#2f8cff]' : 'text-slate-500'
                        }`}
                        style={{
                          fontVariationSettings: active ? "'FILL' 1, 'wght' 500" : "'FILL' 0, 'wght' 400",
                        }}
                      >
                        {item.icon}
                      </span>
                      {active && (
                        <span className="absolute -top-1 right-1 h-2.5 w-2.5 rounded-full bg-[#2f8cff] ring-4 ring-[rgba(7,16,27,0.9)]" />
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-[0.16em] ${
                        active ? 'text-[#2f8cff]' : 'text-slate-500'
                      }`}
                    >
                      {item.label}
                    </span>
                  </NavLink>
                );
              })}

              <button
                type="button"
                onClick={() => setIsOpen((current) => !current)}
                className="group flex min-w-[4.6rem] flex-1 flex-col items-center gap-1 px-1 py-2"
              >
                <div
                  className={`relative flex h-11 w-11 items-center justify-center rounded-2xl transition-all ${
                    isMoreActive || isOpen ? 'bg-[rgba(47,140,255,0.14)]' : 'bg-transparent'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[22px] ${
                      isMoreActive || isOpen ? 'text-[#2f8cff]' : 'text-slate-500'
                    }`}
                    style={{
                      fontVariationSettings:
                        isMoreActive || isOpen ? "'FILL' 1, 'wght' 500" : "'FILL' 0, 'wght' 400",
                    }}
                  >
                    {isOpen ? 'close' : 'more_horiz'}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-[0.16em] ${
                    isMoreActive || isOpen ? 'text-[#2f8cff]' : 'text-slate-500'
                  }`}
                >
                  Más
                </span>
              </button>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default MobileNav;
