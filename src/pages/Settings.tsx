import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useStore } from '../store/useStore';
import ConfirmDialog from '../components/ConfirmDialog';
import { enableRestPush, disableRestPush, isPushSupported } from '../lib/push';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { userData } = useStore();
  const [newPassword, setNewPassword] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    () => localStorage.getItem('fitness-rest-timer-notifications') !== 'off'
  );
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Las contraseñas no coinciden' });
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordMessage({ type: 'success', text: 'Contraseña actualizada correctamente' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setPasswordMessage({
        type: 'error',
        text: error.message || 'Error al actualizar la contraseña',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mobile-page max-w-3xl space-y-4">
        <section className="mobile-card flex items-center gap-4 p-4">
          <img
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userData?.email || 'User'}`}
            alt="Profile Avatar"
            className="size-16 rounded-full border-2 border-[#2f8cff]"
          />
          <div>
            <p className="text-lg font-bold text-slate-900">
              {userData?.user_metadata?.full_name || userData?.email?.split('@')[0] || 'Usuario'}
            </p>
            <p className="text-sm text-slate-500">{userData?.email || 'Modo Invitado'}</p>
          </div>
        </section>

        <section className="mobile-card p-5">
          <p className="mobile-kicker">Preferencias</p>
          <div className="mt-4 space-y-4">
            <div className="mobile-card-soft flex items-center justify-between p-4">
              <div>
                <p className="font-semibold text-slate-900">Notificaciones de descanso</p>
                <p className="mt-1 text-sm text-slate-500">
                  Aviso al terminar el descanso, incluso con la pantalla bloqueada
                </p>
              </div>
              <Button variant="ghost"
                type="button"
                role="switch"
                aria-label="Notificaciones de descanso"
                aria-checked={notificationsEnabled}
                onClick={async () => {
                  const next = !notificationsEnabled;
                  localStorage.setItem('fitness-rest-timer-notifications', next ? 'on' : 'off');
                  setNotificationsEnabled(next);
                  if (next) {
                    if (isPushSupported()) await enableRestPush();
                  } else {
                    await disableRestPush();
                  }
                }}
                className={`relative flex h-11 w-14 shrink-0 items-center rounded-full px-1 transition-colors ${
                  notificationsEnabled ? 'bg-primary' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`h-9 w-9 rounded-full bg-white shadow transition-transform ${
                    notificationsEnabled ? 'translate-x-3' : 'translate-x-0'
                  }`}
                />
              </Button>
            </div>
          </div>
        </section>

        <section className="mobile-card p-5">
          <p className="mobile-kicker">Seguridad</p>
          <h2 className="mt-2 text-xl font-bold text-slate-900">Cambio de contraseña</h2>

          <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nueva contraseña"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-[#2f8cff]"
            />
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmar contraseña"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-[#2f8cff]"
            />

            {passwordMessage && (
              <div
                className={`rounded-2xl px-4 py-3 text-sm ${
                  passwordMessage.type === 'success'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {passwordMessage.text}
              </div>
            )}

            <Button
              type="submit"
              disabled={isChangingPassword || !newPassword || !confirmPassword}
              className="flex w-full items-center justify-center gap-2 rounded-[1.1rem] bg-primary px-5 py-3 text-sm font-bold text-white shadow-sm shadow-primary/10 disabled:opacity-50"
            >
              {isChangingPassword && (
                <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
              )}
              Actualizar contraseña
            </Button>
          </form>
        </section>

        <Button variant="ghost"
          onClick={() => setLogoutConfirmOpen(true)}
          className="mobile-card w-full border-red-200 p-4 font-bold text-red-600"
        >
          Cerrar sesión
        </Button>

        <Button variant="ghost"
          onClick={() => navigate('/guide')}
          className="mobile-card-soft w-full p-4 text-sm font-semibold text-slate-600"
        >
          Abrir guía de ayuda
        </Button>

        <ConfirmDialog
          isOpen={logoutConfirmOpen}
          title="Cerrar sesión"
          description="¿Cerrar sesión en este dispositivo?"
          confirmLabel="Cerrar sesión"
          variant="danger"
          onCancel={() => setLogoutConfirmOpen(false)}
          onConfirm={async () => {
            setLogoutConfirmOpen(false);
            await supabase.auth.signOut();
            navigate('/');
          }}
        />
      </div>
    </div>
  );
};

export default Settings;
