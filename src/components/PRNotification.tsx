import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';

const PRNotification: React.FC = () => {
  const { notification, dismissNotification } = useStore();

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      dismissNotification();
    }, 5000);
    return () => clearTimeout(timer);
  }, [notification, dismissNotification]);

  if (!notification) return null;

  return (
    <div className="fixed left-1/2 top-4 z-[100] w-[92%] max-w-sm -translate-x-1/2 animate-in duration-300 fade-in slide-in-from-top-4">
      <div className="rounded-[1.4rem] border border-[rgba(73,133,214,0.18)] bg-[rgba(8,18,31,0.96)] p-4 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="flex size-11 items-center justify-center rounded-full bg-[rgba(47,140,255,0.14)] text-[#4ea0ff]">
            <span className="material-symbols-outlined text-[24px]">military_tech</span>
          </div>
          <div className="flex-1">
            <h4 className="text-base font-bold leading-tight text-white">{notification.title}</h4>
            <p className="mt-0.5 text-sm text-slate-300">{notification.message}</p>
          </div>
          <button onClick={dismissNotification} className="text-slate-500 hover:text-white">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PRNotification;
