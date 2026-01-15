import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { User } from '../types';
import { Lock, Save, AlertCircle, CheckCircle, User as UserIcon, Edit2 } from 'lucide-react';

interface Props {
    user: User;
    onUserUpdate?: (updatedUser: User) => void;
}

export const UserProfile: React.FC<Props> = ({ user, onUserUpdate }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Profile editing state
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileName, setProfileName] = useState(user.name || '');
    const [profileLoading, setProfileLoading] = useState(false);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: 'Las contraseñas no coinciden' });
            return;
        }
        if (password.length < 6) {
            setMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres' });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            setMessage({ type: 'success', text: 'Contraseña actualizada correctamente' });
            setPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            console.error('Error updating password:', err);
            setMessage({ type: 'error', text: err.message || 'Error al actualizar contraseña' });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profileName.trim()) {
            setMessage({ type: 'error', text: 'El nombre no puede estar vacío' });
            return;
        }

        setProfileLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase.auth.updateUser({
                data: { nombre: profileName.trim() }
            });
            if (error) throw error;

            setMessage({ type: 'success', text: 'Perfil actualizado correctamente' });
            setIsEditingProfile(false);

            // Notify parent to update user state
            if (onUserUpdate) {
                onUserUpdate({ ...user, name: profileName.trim() });
            }
        } catch (err: any) {
            console.error('Error updating profile:', err);
            setMessage({ type: 'error', text: err.message || 'Error al actualizar perfil' });
        } finally {
            setProfileLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <h1 className="text-2xl font-bold text-gray-800">Mi Perfil</h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 space-y-8">
                {/* User Info */}
                <div className="pb-8 border-b border-gray-100">
                    <div className="flex items-center gap-6 mb-6">
                        <div className="w-20 h-20 rounded-full bg-brand-light flex items-center justify-center text-brand-blue font-bold text-2xl">
                            {user.email?.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1">
                            {isEditingProfile ? (
                                <form onSubmit={handleUpdateProfile} className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                                        <input
                                            type="text"
                                            value={profileName}
                                            onChange={(e) => setProfileName(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue/20 outline-none"
                                            placeholder="Tu nombre"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            type="submit"
                                            disabled={profileLoading}
                                            className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
                                        >
                                            {profileLoading ? 'Guardando...' : <><Save size={16} /> Guardar</>}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsEditingProfile(false);
                                                setProfileName(user.name || '');
                                            }}
                                            className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-xl font-bold text-gray-900">{user.name || user.companyName}</h2>
                                        <button
                                            onClick={() => setIsEditingProfile(true)}
                                            className="p-1.5 text-gray-400 hover:text-brand-blue hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Editar nombre"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    </div>
                                    <p className="text-gray-500">{user.email}</p>
                                    <span className="inline-block mt-2 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium uppercase">{user.role}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Change Password */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Lock size={20} className="text-brand-blue" />
                        Cambiar Contraseña
                    </h3>

                    {message && (
                        <div className={`p-4 mb-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue/20 outline-none"
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue/20 outline-none"
                                placeholder="••••••••"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading || !password}
                            className="flex items-center gap-2 px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Guardando...' : <><Save size={18} /> Actualizar Contraseña</>}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
