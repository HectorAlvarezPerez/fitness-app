import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabaseClient';
import { ActiveWorkoutFooter } from './ActiveWorkoutFooter';
import PRNotification from './PRNotification';
import MobileNav from './MobileNav';
import logoUrl from '../assets/logo-fitness.png';

const MainLayout: React.FC = () => {
    const { pathname } = useLocation();
    const { loadActiveWorkout } = useStore();
    const [keyboardInset, setKeyboardInset] = useState(0);
    const isKeyboardOpen = keyboardInset > 0;

    useEffect(() => {
        void loadActiveWorkout();
    }, [loadActiveWorkout]);

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
            if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) return;

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

    // Mapping for title
    const getTitle = () => {
        if (pathname.includes('/home')) return 'Inicio';
        if (pathname.includes('/routine/new')) return 'Nueva Rutina';
        if (pathname.includes('/routine/edit')) return 'Editar Rutina';
        if (pathname.includes('/routine') && pathname.includes('/workout')) return 'Entrenando';
        if (pathname.includes('/routine')) return 'Rutinas';
        if (pathname.includes('/dashboard')) return 'Estadísticas';
        if (pathname.includes('/progress')) return 'Progreso';
        if (pathname.includes('/pr')) return 'Personal Records';
        if (pathname.includes('/exercises/new')) return 'Nuevo Ejercicio';
        if (pathname.includes('/exercises') && pathname.includes('/edit')) return 'Editar Ejercicio';
        if (pathname.includes('/exercises')) return 'Exercises';

        if (pathname.includes('/history')) return 'Historial';
        if (pathname.includes('/settings')) return 'Configuración';
        if (pathname.includes('/profile-data')) return 'Mis Datos';
        return 'Fitness App';
    };

    const navItems = [
        { path: '/home', label: 'Inicio', icon: 'home' },
        { path: '/dashboard', label: 'Estadísticas', icon: 'bar_chart' },
        { path: '/routine', label: 'Rutinas', icon: 'fitness_center' },
        { path: '/pr', label: 'PR', icon: 'military_tech' },
        { path: '/exercises', label: 'Exercises', icon: 'list_alt' },
        { path: '/progress', label: 'Progreso', icon: 'accessibility_new' },
        { path: '/history', label: 'Historial', icon: 'history' },

    ];

    // Check if we should hide bottom nav (during workout or editor)
    const hideBottomNav = pathname.includes('/workout')
        || pathname.includes('/routine/new')
        || pathname.includes('/routine/edit')
        || pathname.includes('/exercises/new')
        || (pathname.includes('/exercises/') && pathname.includes('/edit'));
    const mainPadding = hideBottomNav
        ? 'pb-0'
        : 'pb-[calc(72px+env(safe-area-inset-bottom)+var(--keyboard-inset,0px))] md:pb-0';

    return (
        <div className="flex flex-col min-h-[100dvh] h-[100dvh] bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display overflow-hidden">
            <PRNotification />
            {/* Desktop Header */}
            <header className="hidden md:flex items-center justify-between px-8 py-4 bg-white/80 dark:bg-[#111a22]/90 backdrop-blur-md border-b border-gray-200 dark:border-[#233648] shrink-0 z-20">
                <NavLink to="/home" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-orange-600 text-white shadow-lg shadow-primary/20 overflow-hidden">
                        <img src={logoUrl} alt="Fitness App" className="h-full w-full object-contain" />
                    </div>
                    <span className="text-xl font-bold tracking-tight">Fitness App</span>
                </NavLink>

                <nav className="flex items-center gap-2 bg-gray-100 dark:bg-[#1a2632] p-1 rounded-full">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={(navData) => `flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition-all ${navData.isActive ? 'bg-white dark:bg-[#233648] text-primary shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                        >
                            <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <ProfileDropdown />
            </header>

            {/* Mobile Header - Improved for smaller screens */}
            <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0a0c0e]/95 backdrop-blur-md border-b border-white/5 shrink-0 z-20">
                <h1 className="text-lg font-bold truncate">{getTitle()}</h1>
                <ProfileDropdown />
            </header>

            {/* Main Content - Add padding for bottom nav on mobile */}
            <main className={`flex-1 min-h-0 overflow-hidden ${mainPadding}`}>
                <Outlet />
            </main>

            {/* Active Workout Footer (shows above bottom nav, but not on workout page) */}
            {!pathname.includes('/workout') && !isKeyboardOpen && <ActiveWorkoutFooter />}

            {/* New Mobile Bottom Navigation */}
            {!hideBottomNav && !isKeyboardOpen && <MobileNav />}
        </div>
    );
};

// Profile Dropdown Component
const ProfileDropdown: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { userData, loadUserData } = useStore();

    useEffect(() => {
        loadUserData();
    }, []);

    // Close dropdown when clicking outside
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

    const displayName = userData?.user_metadata?.full_name || userData?.email?.split('@')[0] || 'Usuario';
    const displayEmail = userData?.email || 'Modo Invitado';

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="size-9 rounded-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-white font-bold hover:scale-105 active:scale-95 transition-transform overflow-hidden"
            >
                <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`}
                    alt="Profile"
                    className="w-full h-full object-cover"
                />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#1a1d21] border border-white/10 shadow-2xl overflow-hidden z-50">
                    <div className="p-3 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <img
                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`}
                                alt="Profile"
                                className="size-10 rounded-full"
                            />
                            <div className="overflow-hidden">
                                <p className="font-bold text-sm truncate text-white">{displayName}</p>
                                <p className="text-xs text-gray-400 truncate">{displayEmail}</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-2">
                        <NavLink
                            to="/profile-data"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[20px] text-gray-400">assignment_ind</span>
                            <span className="text-sm font-medium text-white">Mis Datos</span>
                        </NavLink>

                        <NavLink
                            to="/settings"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[20px] text-gray-400">settings</span>
                            <span className="text-sm font-medium text-white">Configuración</span>
                        </NavLink>

                        <NavLink
                            to="/guide"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 active:bg-white/10 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[20px] text-gray-400">help</span>
                            <span className="text-sm font-medium text-white">Ayuda</span>
                        </NavLink>
                    </div>

                    <div className="p-2 border-t border-white/5">
                        <button
                            onClick={async () => {
                                setIsOpen(false);
                                await supabase.auth.signOut();
                                window.location.href = '/';
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 active:bg-red-500/20 text-red-400 transition-colors"
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
