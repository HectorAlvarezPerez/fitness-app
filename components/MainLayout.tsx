import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabaseClient';
import { ActiveWorkoutFooter } from './ActiveWorkoutFooter';
import AchievementNotification from './AchievementNotification';

const MainLayout: React.FC = () => {
    const { pathname } = useLocation();

    // Mapping for title
    // Mapping for title
    const getTitle = () => {
        if (pathname.includes('/home')) return 'Inicio';
        if (pathname.includes('/routine')) return 'Rutinas';
        if (pathname.includes('/dashboard')) return 'Estadísticas';
        if (pathname.includes('/progress')) return 'Progreso';
        if (pathname.includes('/achievements')) return 'Logros';
        if (pathname.includes('/history')) return 'Historial';
        if (pathname.includes('/settings')) return 'Configuración';
        return 'Fitness App';
    };

    const navItems = [
        { path: '/home', label: 'Inicio', icon: 'home' },
        { path: '/dashboard', label: 'Estadísticas', icon: 'bar_chart' },
        { path: '/routine', label: 'Rutinas', icon: 'fitness_center' },
        { path: '/progress', label: 'Progreso', icon: 'accessibility_new' },
        { path: '/history', label: 'Historial', icon: 'history' },
        { path: '/achievements', label: 'Logros', icon: 'emoji_events' },
    ];

    return (
        <div className="flex flex-col h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display overflow-hidden">
            <AchievementNotification />
            {/* Desktop Header */}
            <header className="hidden md:flex items-center justify-between px-8 py-4 bg-white/80 dark:bg-[#111a22]/90 backdrop-blur-md border-b border-gray-200 dark:border-[#233648] shrink-0 z-20">
                <NavLink to="/home" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-orange-600 text-white shadow-lg shadow-primary/20">
                        <span className="material-symbols-outlined text-[20px]">fitness_center</span>
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

            {/* Mobile Header */}
            <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-[#111a22] border-b border-gray-200 dark:border-[#233648] shrink-0 z-20">
                <h1 className="text-lg font-bold">{getTitle()}</h1>
                <ProfileDropdown />
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden">
                <Outlet />
            </main>

            {/* Active Workout Footer (shows above bottom nav, but not on workout page) */}
            {!pathname.includes('/workout') && <ActiveWorkoutFooter />}

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden flex items-center justify-around bg-white dark:bg-[#111a22] border-t border-gray-200 dark:border-[#233648] p-2 shrink-0 z-20">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={(navData) => `flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${navData.isActive ? 'text-primary' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                        <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
                        <span className="text-[10px] font-bold">{item.label}</span>
                    </NavLink>
                ))}
            </nav>
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
                className="size-9 rounded-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-white font-bold hover:scale-105 transition-transform overflow-hidden"
            >
                <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`}
                    alt="Profile"
                    className="w-full h-full object-cover"
                />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-[#1a2632] border border-gray-200 dark:border-[#233648] shadow-xl overflow-hidden z-50">
                    <div className="p-3 border-b border-gray-200 dark:border-[#233648]">
                        <div className="flex items-center gap-3">
                            <img
                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`}
                                alt="Profile"
                                className="size-10 rounded-full"
                            />
                            <div className="overflow-hidden">
                                <p className="font-bold text-sm truncate">{displayName}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{displayEmail}</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-2">
                        <NavLink
                            to="/profile-data"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#0f1820] transition-colors"
                        >
                            <span className="material-symbols-outlined text-[20px] text-gray-500">assignment_ind</span>
                            <span className="text-sm font-medium">Mis Datos</span>
                        </NavLink>

                        <NavLink
                            to="/settings"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#0f1820] transition-colors"
                        >
                            <span className="material-symbols-outlined text-[20px] text-gray-500">settings</span>
                            <span className="text-sm font-medium">Configuración</span>
                        </NavLink>

                        <NavLink
                            to="/history"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#0f1820] transition-colors"
                        >
                            <span className="material-symbols-outlined text-[20px] text-gray-500">history</span>
                            <span className="text-sm font-medium">Historial</span>
                        </NavLink>
                    </div>

                    <div className="p-2 border-t border-gray-200 dark:border-[#233648]">
                        <NavLink
                            to="/"
                            onClick={async () => {
                                setIsOpen(false);
                                await supabase.auth.signOut();
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[20px]">logout</span>
                            <span className="text-sm font-medium">Cerrar Sesión</span>
                        </NavLink>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MainLayout;
