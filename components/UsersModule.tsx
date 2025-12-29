import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { User, UserPlus, Key, Trash2, Edit2, Check, X, Loader2 } from 'lucide-react';

interface AdminUser {
    id: string;
    email: string;
    role: string;
    full_name: string;
    last_sign_in_at: string;
    created_at: string;
}

export const UsersModule = () => {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [roles, setRoles] = useState<{ id: number, name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
    const [formData, setFormData] = useState({ email: '', password: '', full_name: '', role: 'user' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch Roles
            const rolesRes = await supabase.from('roles').select('id, name').order('name');
            if (rolesRes.error) {
                console.error('Error loading roles:', rolesRes.error);
            } else {
                setRoles(rolesRes.data || []);
            }

            // Fetch Users
            const usersRes = await supabase.functions.invoke('admin-user-ops', {
                body: { action: 'list_users' }
            });

            if (usersRes.error) {
                console.error('Error loading users function:', usersRes.error);
            } else {
                setUsers(usersRes.data.users || []);
            }

        } catch (err) {
            console.error('Error in fetchData:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const action = editingUser ? 'update_user' : 'create_user';
            const payload: any = {
                email: formData.email,
                user_metadata: { full_name: formData.full_name },
                role: formData.role // Pass role name
            };
            if (formData.password) payload.password = formData.password;
            if (!editingUser) payload.email_confirm = true;

            const { error } = await supabase.functions.invoke('admin-user-ops', {
                body: {
                    action,
                    userId: editingUser?.id,
                    payload
                }
            });

            if (error) throw error;

            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            console.error('Error saving user:', err);
            alert('Error al guardar usuario');
        }
    };

    const deleteUser = async (id: string) => {
        if (!confirm('¿Está seguro de eliminar este usuario?')) return;
        try {
            const { error } = await supabase.functions.invoke('admin-user-ops', {
                body: { action: 'delete_user', userId: id }
            });
            if (error) throw error;
            fetchData();
        } catch (err) {
            console.error(err);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Gestión de Usuarios</h1>
                <button
                    onClick={() => { setEditingUser(null); setFormData({ email: '', password: '', full_name: '', role: roles[0]?.name || 'user' }); setIsModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <UserPlus size={20} /> Nuevo Usuario
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-brand-blue" /></div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuario</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rol</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ultimo Acceso</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-brand-light flex items-center justify-center text-brand-blue font-bold text-xs">
                                                {user.email?.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{user.full_name}</p>
                                                <p className="text-xs text-gray-500">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${user.role === 'administrator' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                            }`}>
                                            {user.role.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Nunca'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => { setEditingUser(user); setFormData({ email: user.email, password: '', full_name: user.full_name, role: user.role }); setIsModalOpen(true); }}
                                                className="p-1 text-gray-400 hover:text-brand-blue transition-colors" title="Editar">
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => deleteUser(user.id)}
                                                className="p-1 text-gray-400 hover:text-red-500 transition-colors" title="Eliminar">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                                <input type="text" required value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input type="email" required disabled={!!editingUser} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                                <select
                                    className="w-full px-3 py-2 border rounded-lg bg-white"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                >
                                    {roles.map(role => (
                                        <option key={role.id} value={role.name}>{role.name.replace('_', ' ')}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{editingUser ? 'Nueva Contraseña (Opcional)' : 'Contraseña'}</label>
                                <input type="password" required={!editingUser} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder={editingUser ? 'Dejar vacío para mantener' : '******'} />
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-blue-700">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
