import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useStore } from '../store/useStore';
import ConfirmDialog from '../components/ConfirmDialog';

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
            <p className="text-lg font-bold text-white">
              {userData?.user_metadata?.full_name || userData?.email?.split('@')[0] || 'Usuario'}
            </p>
            <p className="text-sm text-slate-400">{userData?.email || 'Modo Invitado'}</p>
          </div>
        </section>

        <section className="mobile-card p-5">
          <p className="mobile-kicker">Preferencias</p>
          <div className="mt-4 space-y-4">
            <div className="mobile-card-soft flex items-center justify-between p-4">
              <div>
                <p className="font-semibold text-white">Notificaciones</p>
                <p className="mt-1 text-sm text-slate-400">
                  Temporizador de descanso y avisos clave
                </p>
              </div>
              <button
                onClick={() => {
                  const next = !notificationsEnabled;
                  localStorage.setItem('fitness-rest-timer-notifications', next ? 'on' : 'off');
                  setNotificationsEnabled(next);
                }}
                className={`relative h-7 w-12 rounded-full transition-colors ${
                  notificationsEnabled ? 'bg-[#2f8cff]' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                    notificationsEnabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        <section className="mobile-card p-5">
          <p className="mobile-kicker">Seguridad</p>
          <h2 className="mt-2 text-xl font-bold text-white">Cambio de contraseña</h2>

          <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nueva contraseña"
              className="w-full rounded-2xl border border-[rgba(73,133,214,0.16)] bg-[rgba(10,20,34,0.72)] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#2f8cff]"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmar contraseña"
              className="w-full rounded-2xl border border-[rgba(73,133,214,0.16)] bg-[rgba(10,20,34,0.72)] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#2f8cff]"
            />

            {passwordMessage && (
              <div
                className={`rounded-2xl px-4 py-3 text-sm ${
                  passwordMessage.type === 'success'
                    ? 'bg-green-500/10 text-green-200'
                    : 'bg-red-500/10 text-red-200'
                }`}
              >
                {passwordMessage.text}
              </div>
            )}

            <button
              type="submit"
              disabled={isChangingPassword || !newPassword || !confirmPassword}
              className="flex w-full items-center justify-center gap-2 rounded-[1.1rem] bg-gradient-to-r from-[#2f8cff] to-[#1e6de5] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#2f8cff]/25 disabled:opacity-50"
            >
              {isChangingPassword && (
                <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
              )}
              Actualizar contraseña
            </button>
          </form>
        </section>

        <button
          onClick={() => setLogoutConfirmOpen(true)}
          className="mobile-card w-full border-red-500/25 p-4 font-bold text-red-400"
        >
          Cerrar sesión
        </button>

        <button
          onClick={() => navigate('/guide')}
          className="mobile-card-soft w-full p-4 text-sm font-semibold text-slate-300"
        >
          Abrir guía de ayuda
        </button>

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
