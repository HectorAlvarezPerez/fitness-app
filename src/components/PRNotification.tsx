import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Button } from './ui/button';

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
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-md">
        <div className="flex items-center gap-4">
          <div
            className={`flex size-11 shrink-0 items-center justify-center rounded-full ${notification.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}
          >
            <span className="material-symbols-outlined text-[24px]">
              {notification.type === 'error' ? 'error' : 'military_tech'}
            </span>
          </div>
          <div className="flex-1">
            <h4 className="text-base font-bold leading-tight text-slate-950">{notification.title}</h4>
            <p className="mt-0.5 text-sm text-slate-600">{notification.message}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Cerrar notificación"
            onClick={dismissNotification}
            className="size-11 shrink-0 text-slate-600"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PRNotification;
