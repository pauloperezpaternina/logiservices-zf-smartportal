
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Plus, Edit2, Trash2, Building2, User, Check, X } from 'lucide-react';

interface Entidad {
    id: string;
    nombre: string;
    identificacion: string;
    email: string;
    telefono: string;
    es_cliente: boolean;
    es_agencia: boolean;
    created_at?: string;
}

export const EntidadesModule: React.FC = () => {
    const [entidades, setEntidades] = useState<Entidad[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<Entidad>>({
        nombre: '',
        identificacion: '',
        email: '',
        telefono: '',
        es_cliente: false,
        es_agencia: false
    });

    useEffect(() => {
        fetchEntidades();
    }, []);

    const fetchEntidades = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('entidades')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setEntidades(data || []);
        } catch (error) {
            console.error('Error loading entities:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.nombre || (!formData.es_cliente && !formData.es_agencia)) {
            alert('Nombre y al menos un tipo (Cliente o Agencia) son requeridos');
            return;
        }

        try {
            if (editingId) {
                const { error } = await supabase
                    .from('entidades')
                    .update(formData)
                    .eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('entidades')
                    .insert([formData]);
                if (error) throw error;
            }

            fetchEntidades();
            handleCancel();
        } catch (error) {
            console.error('Error saving entity:', error);
            alert('Error al guardar la entidad');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta entidad?')) return;
        try {
            const { error } = await supabase.from('entidades').delete().eq('id', id);
            if (error) throw error;
            fetchEntidades();
        } catch (error) {
            console.error('Error deleting entity:', error);
            alert('Error al eliminar');
        }
    };

    const handleEdit = (entidad: Entidad) => {
        setFormData(entidad);
        setEditingId(entidad.id);
        setShowForm(true);
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingId(null);
        setFormData({
            nombre: '',
            identificacion: '',
            email: '',
            telefono: '',
            es_cliente: false,
            es_agencia: false
        });
    };

    // Render Form
    if (showForm) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6">
                    {editingId ? 'Editar Entidad' : 'Nueva Entidad'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre / Razón Social</label>
                            <input
                                type="text"
                                required
                                className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-blue/20"
                                value={formData.nombre}
                                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Identificación (NIT/CC)</label>
                            <input
                                type="text"
                                className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-blue/20"
                                value={formData.identificacion || ''}
                                onChange={e => setFormData({ ...formData, identificacion: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-blue/20"
                                value={formData.email || ''}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                            <input
                                type="text"
                                className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-blue/20"
                                value={formData.telefono || ''}
                                onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex gap-6 p-4 bg-gray-50 rounded-lg">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                className="w-4 h-4 text-brand-blue rounded border-gray-300 focus:ring-brand-blue"
                                checked={formData.es_cliente}
                                onChange={e => setFormData({ ...formData, es_cliente: e.target.checked })}
                            />
                            <span className="text-sm font-medium text-gray-700">Es Cliente</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                className="w-4 h-4 text-brand-blue rounded border-gray-300 focus:ring-brand-blue"
                                checked={formData.es_agencia}
                                onChange={e => setFormData({ ...formData, es_agencia: e.target.checked })}
                            />
                            <span className="text-sm font-medium text-gray-700">Es Agencia de Aduanas</span>
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-blue-900 transition-colors flex items-center gap-2"
                        >
                            <Check size={18} /> Guardar
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    // Render List
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800">Directorio de Entidades</h2>
                <button
                    onClick={() => setShowForm(true)}
                    className="px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-blue-900 transition-colors flex items-center gap-2 shadow-sm"
                >
                    <Plus size={18} /> Nueva Entidad
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                            <tr>
                                <th className="px-6 py-4">Nombre / Razón Social</th>
                                <th className="px-6 py-4">Identificación</th>
                                <th className="px-6 py-4">Contacto</th>
                                <th className="px-6 py-4">Roles</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        Cargando entidades...
                                    </td>
                                </tr>
                            ) : entidades.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        No hay entidades registradas. Crea una nueva para comenzar.
                                    </td>
                                </tr>
                            ) : (
                                entidades.map(entidad => (
                                    <tr key={entidad.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">{entidad.nombre}</td>
                                        <td className="px-6 py-4 text-gray-600">{entidad.identificacion || '-'}</td>
                                        <td className="px-6 py-4 text-gray-600">
                                            <div className="flex flex-col">
                                                <span>{entidad.email}</span>
                                                <span className="text-xs text-gray-400">{entidad.telefono}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                {entidad.es_cliente && (
                                                    <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-100 flex items-center gap-1">
                                                        <User size={10} /> Cliente
                                                    </span>
                                                )}
                                                {entidad.es_agencia && (
                                                    <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-full border border-purple-100 flex items-center gap-1">
                                                        <Building2 size={10} /> Agencia
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 text-gray-400">
                                                <button onClick={() => handleEdit(entidad)} className="hover:text-brand-blue p-1 rounded hover:bg-brand-blue/5">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(entidad.id)} className="hover:text-red-600 p-1 rounded hover:bg-red-50">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
