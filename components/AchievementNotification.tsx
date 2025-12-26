import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';

const AchievementNotification: React.FC = () => {
    const { notification, dismissNotification } = useStore();

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                dismissNotification();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [notification, dismissNotification]);

    if (!notification) return null;

    const isAchievement = notification.type === 'achievement';
    const bgGradient = isAchievement
        ? 'bg-gradient-to-r from-yellow-500 to-amber-600'
        : 'bg-gradient-to-r from-blue-500 to-indigo-600';

    const icon = isAchievement ? 'emoji_events' : 'fitness_center';

    return (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300 w-[90%] max-w-sm">
            <div className={`${bgGradient} text-white p-4 rounded-xl shadow-2xl flex items-center gap-4`}>
                <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                    <span className="material-symbols-outlined text-2xl">{icon}</span>
                </div>
                <div className="flex-1">
                    <h4 className="font-bold text-lg leading-tight">{notification.title}</h4>
                    <p className="text-white/90 text-sm">{notification.message}</p>
                </div>
                <button onClick={dismissNotification} className="text-white/70 hover:text-white">
                    <span className="material-symbols-outlined text-sm">close</span>
                </button>
            </div>
        </div>
    );
};

export default AchievementNotification;
