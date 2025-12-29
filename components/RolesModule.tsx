import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Shield, Plus, Trash2, Edit2, Loader2, Check } from 'lucide-react';

interface Role {
    id: number;
    name: string;
}

interface Permission {
    id: number;
    name: string;
    description: string;
}

interface RolePermission {
    role_id: number;
    permission_id: number;
}

export const RolesModule = () => {
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [roleName, setRoleName] = useState('');
    const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [rolesRes, permissionsRes] = await Promise.all([
                supabase.from('roles').select('*').order('id'),
                supabase.from('permissions').select('*').order('name')
            ]);

            if (rolesRes.error) throw rolesRes.error;
            if (permissionsRes.error) throw permissionsRes.error;

            setRoles(rolesRes.data || []);
            setPermissions(permissionsRes.data || []);
        } catch (err) {
            console.error('Error fetching roles/permissions:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = async (role: Role) => {
        setEditingRole(role);
        setRoleName(role.name);

        // Fetch current permissions for this role
        const { data } = await supabase
            .from('role_permissions')
            .select('permission_id')
            .eq('role_id', role.id);

        setSelectedPermissions(data?.map(rp => rp.permission_id) || []);
        setIsModalOpen(true);
    };

    const handleCreateClick = () => {
        setEditingRole(null);
        setRoleName('');
        setSelectedPermissions([]);
        setIsModalOpen(true);
    };

    const deleteRole = async (id: number) => {
        if (!confirm('¿Está seguro de eliminar este rol?')) return;
        try {
            const { error } = await supabase.from('roles').delete().eq('id', id);
            if (error) throw error;
            fetchData();
        } catch (err) {
            console.error(err);
            alert('Error al eliminar rol');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let roleId = editingRole?.id;

            if (editingRole) {
                // Update name
                const { error } = await supabase
                    .from('roles')
                    .update({ name: roleName })
                    .eq('id', roleId);
                if (error) throw error;
            } else {
                // Create role
                const { data, error } = await supabase
                    .from('roles')
                    .insert({ name: roleName })
                    .select()
                    .single();
                if (error) throw error;
                roleId = data.id;
            }

            if (roleId) {
                // Sync permissions
                // First delete existing
                await supabase.from('role_permissions').delete().eq('role_id', roleId);

                // Then insert new
                if (selectedPermissions.length > 0) {
                    const { error: permError } = await supabase
                        .from('role_permissions')
                        .insert(
                            selectedPermissions.map(pid => ({ role_id: roleId, permission_id: pid }))
                        );
                    if (permError) throw permError;
                }
            }

            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            console.error(err);
            alert('Error al guardar el rol');
        }
    };

    const togglePermission = (id: number) => {
        setSelectedPermissions(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Roles y Permisos</h1>
                <button
                    onClick={handleCreateClick}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus size={20} /> Nuevo Rol
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full flex justify-center p-8"><Loader2 className="animate-spin text-brand-blue" /></div>
                ) : (
                    roles.map(role => (
                        <div key={role.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-brand-light rounded-lg text-brand-blue">
                                    <Shield size={24} />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEditClick(role)} className="p-1 text-gray-400 hover:text-brand-blue"><Edit2 size={18} /></button>
                                    <button onClick={() => deleteRole(role.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={18} /></button>
                                </div>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-1 capitalize">{role.name.replace('_', ' ')}</h3>
                            <p className="text-sm text-gray-500">ID: {role.id}</p>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-6">{editingRole ? 'Editar Rol' : 'Nuevo Rol'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Rol</label>
                                <input
                                    type="text"
                                    required
                                    value={roleName}
                                    onChange={e => setRoleName(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-blue/20 outline-none"
                                    placeholder="Ej. operations_manager"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">Permisos</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-60 overflow-y-auto p-4 border rounded-lg bg-gray-50">
                                    {permissions.map(perm => (
                                        <div
                                            key={perm.id}
                                            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedPermissions.includes(perm.id) ? 'bg-white border-brand-blue shadow-sm' : 'border-transparent hover:bg-gray-100'}`}
                                            onClick={() => togglePermission(perm.id)}
                                        >
                                            <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 ${selectedPermissions.includes(perm.id) ? 'bg-brand-blue border-brand-blue text-white' : 'border-gray-300'}`}>
                                                {selectedPermissions.includes(perm.id) && <Check size={14} />}
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm text-gray-900">{perm.name}</p>
                                                <p className="text-xs text-gray-500">{perm.description || 'Sin descripción'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-blue-700">Guardar Rol</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
