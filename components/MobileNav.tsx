import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const MobileNav: React.FC = () => {
    const { pathname } = useLocation();
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    // Hide on scroll down, show on scroll up
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                setIsVisible(false);
            } else {
                setIsVisible(true);
            }
            setLastScrollY(currentScrollY);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [lastScrollY]);

    // Core navigation items (reduced for mobile)
    const navItems = [
        { path: '/home', label: 'Inicio', icon: 'home', activeIcon: 'home' },
        { path: '/routine', label: 'Rutinas', icon: 'fitness_center', activeIcon: 'fitness_center' },
        { path: '/dashboard', label: 'Stats', icon: 'bar_chart', activeIcon: 'bar_chart' },
        { path: '/progress', label: 'Progreso', icon: 'accessibility_new', activeIcon: 'accessibility_new' },
    ];

    // Check if current path matches (handles nested routes)
    const isActive = (path: string) => {
        if (path === '/routine') {
            return pathname.includes('/routine');
        }
        return pathname === path || pathname.startsWith(path + '/');
    };

    return (
        <nav
            className={`md:hidden fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out ${isVisible ? 'translate-y-0' : 'translate-y-full'
                }`}
        >
            {/* Background with blur and gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c0e] via-[#0a0c0e]/95 to-[#0a0c0e]/80 backdrop-blur-xl border-t border-white/5" />

            {/* Safe area padding for notched devices */}
            <div className="relative flex items-center justify-around px-2 pt-2 pb-safe-area-inset-bottom" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
                {navItems.map((item) => {
                    const active = isActive(item.path);
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className="relative flex flex-col items-center gap-0.5 py-2 px-4 min-w-[4.5rem] group"
                        >
                            {/* Active indicator pill */}
                            <div className={`absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full transition-all duration-300 ${active
                                    ? 'bg-gradient-to-r from-primary to-orange-500 opacity-100 scale-100'
                                    : 'opacity-0 scale-75'
                                }`} />

                            {/* Icon container with glow effect */}
                            <div className={`relative p-1.5 rounded-xl transition-all duration-300 ${active
                                    ? 'bg-primary/15'
                                    : 'group-active:bg-white/5'
                                }`}>
                                <span
                                    className={`material-symbols-outlined text-[24px] transition-all duration-300 ${active
                                            ? 'text-primary scale-110'
                                            : 'text-gray-500 group-hover:text-gray-400'
                                        }`}
                                    style={{
                                        fontVariationSettings: active
                                            ? "'FILL' 1, 'wght' 500"
                                            : "'FILL' 0, 'wght' 400"
                                    }}
                                >
                                    {item.icon}
                                </span>

                                {/* Glow effect for active state */}
                                {active && (
                                    <div className="absolute inset-0 rounded-xl bg-primary/20 blur-lg -z-10" />
                                )}
                            </div>

                            {/* Label */}
                            <span className={`text-[10px] font-semibold transition-colors duration-300 ${active ? 'text-primary' : 'text-gray-500'
                                }`}>
                                {item.label}
                            </span>
                        </NavLink>
                    );
                })}

                {/* More menu button */}
                <MoreMenu pathname={pathname} />
            </div>
        </nav>
    );
};

// More menu component for additional navigation items
const MoreMenu: React.FC<{ pathname: string }> = ({ pathname }) => {
    const [isOpen, setIsOpen] = useState(false);

    const menuItems = [
        { path: '/history', label: 'Historial', icon: 'history' },
        { path: '/achievements', label: 'Logros', icon: 'emoji_events' },
        { path: '/settings', label: 'Ajustes', icon: 'settings' },
    ];

    const isMoreActive = menuItems.some(item => pathname.includes(item.path));

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Menu trigger */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative flex flex-col items-center gap-0.5 py-2 px-4 min-w-[4.5rem] group"
            >
                <div className={`absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full transition-all duration-300 ${isMoreActive
                        ? 'bg-gradient-to-r from-primary to-orange-500 opacity-100 scale-100'
                        : 'opacity-0 scale-75'
                    }`} />

                <div className={`relative p-1.5 rounded-xl transition-all duration-300 ${isMoreActive || isOpen ? 'bg-primary/15' : 'group-active:bg-white/5'
                    }`}>
                    <span
                        className={`material-symbols-outlined text-[24px] transition-all duration-300 ${isMoreActive || isOpen
                                ? 'text-primary scale-110'
                                : 'text-gray-500 group-hover:text-gray-400'
                            }`}
                        style={{
                            fontVariationSettings: isMoreActive || isOpen
                                ? "'FILL' 1, 'wght' 500"
                                : "'FILL' 0, 'wght' 400"
                        }}
                    >
                        {isOpen ? 'close' : 'more_horiz'}
                    </span>
                </div>

                <span className={`text-[10px] font-semibold transition-colors duration-300 ${isMoreActive || isOpen ? 'text-primary' : 'text-gray-500'
                    }`}>
                    Más
                </span>
            </button>

            {/* Popup menu */}
            <div className={`absolute bottom-full right-2 mb-3 bg-[#1a1d21] border border-white/10 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 origin-bottom-right ${isOpen
                    ? 'opacity-100 scale-100 translate-y-0'
                    : 'opacity-0 scale-95 translate-y-2 pointer-events-none'
                }`}>
                <div className="p-2 flex flex-col gap-1 min-w-[180px]">
                    {menuItems.map((item) => {
                        const active = pathname.includes(item.path);
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active
                                        ? 'bg-primary/15 text-primary'
                                        : 'text-white hover:bg-white/5'
                                    }`}
                            >
                                <span
                                    className="material-symbols-outlined text-[22px]"
                                    style={{
                                        fontVariationSettings: active
                                            ? "'FILL' 1, 'wght' 500"
                                            : "'FILL' 0, 'wght' 400"
                                    }}
                                >
                                    {item.icon}
                                </span>
                                <span className="font-medium">{item.label}</span>
                            </NavLink>
                        );
                    })}
                </div>
            </div>
        </>
    );
};

export default MobileNav;
