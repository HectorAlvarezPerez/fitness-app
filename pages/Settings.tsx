import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useStore } from '../store/useStore';
import ConfirmDialog from '../components/ConfirmDialog';

const Settings: React.FC = () => {
    const navigate = useNavigate();
    const { userData } = useStore();

    // Password Change State
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

    const handleLogout = async () => {
        setLogoutConfirmOpen(true);
    };

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
            setPasswordMessage({ type: 'error', text: error.message || 'Error al actualizar la contraseña' });
        } finally {
            setIsChangingPassword(false);
        }
    };

    return (
        <div className="h-full w-full overflow-y-auto p-4 md:p-8">
            <div className="flex flex-col max-w-2xl mx-auto gap-6 pb-20">
                {/* Header */}
                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black">Configuración</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Administra tu perfil
                        </p>
                    </div>
                </header>

                {/* Profile Section */}
                <div className="rounded-2xl border border-slate-200 dark:border-[#233648] bg-white dark:bg-[#1a2632] p-6">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">person</span>
                        Perfil
                    </h2>

                    <div className="flex items-center gap-4 mb-6">
                        <img
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userData?.email || 'User'}`}
                            alt="Profile Avatar"
                            className="size-20 rounded-full border-2 border-primary"
                        />
                        <div>
                            <p className="font-bold text-lg">{userData?.user_metadata?.full_name || userData?.email?.split('@')[0] || 'Usuario'}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{userData?.email || 'Modo Invitado'}</p>
                        </div>
                    </div>
                </div>

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

                {/* Security Section (Password Change) */}
                <div className="rounded-2xl border border-slate-200 dark:border-[#233648] bg-white dark:bg-[#1a2632] p-6">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">lock</span>
                        Seguridad
                    </h2>

                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                            <label className="text-sm font-bold text-slate-900 dark:text-white block mb-1">Nueva Contraseña</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Mínimo 6 caracteres"
                                className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-[#0f1820] border border-gray-200 dark:border-[#233648] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-slate-900 dark:text-white block mb-1">Confirmar Contraseña</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Repite la contraseña"
                                className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-[#0f1820] border border-gray-200 dark:border-[#233648] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                            />
                        </div>

                        {passwordMessage && (
                            <div className={`p-3 rounded-lg text-sm font-bold ${passwordMessage.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                {passwordMessage.text}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isChangingPassword || !newPassword || !confirmPassword}
                            className="px-6 py-2.5 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isChangingPassword && <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>}
                            Actualizar Contraseña
                        </button>
                    </form>
                </div>

                {/* Logout Button */}
                <button
                    onClick={handleLogout}
                    className="w-full py-3 rounded-full border-2 border-red-500 text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center justify-center gap-2"
                >
                    <span className="material-symbols-outlined">logout</span>
                    Cerrar Sesión
                </button>
            </div>
        </div>
    );
};

export default Settings;
