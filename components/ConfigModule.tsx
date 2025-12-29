import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Settings, Save, Loader2 } from 'lucide-react';

interface ConfigItem {
    key: string;
    value: string;
    description: string;
}

export const ConfigModule = () => {
    const [configs, setConfigs] = useState<ConfigItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('app_configuration')
                .select('*')
                .order('key');

            if (error) throw error;
            setConfigs(data || []);
        } catch (error) {
            console.error('Error loading configs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (key: string, newValue: string) => {
        setSaving(true);
        setMessage('');
        try {
            const { error } = await supabase
                .from('app_configuration')
                .update({ value: newValue })
                .eq('key', key);

            if (error) throw error;

            // Update local state
            setConfigs(configs.map(c => c.key === key ? { ...c, value: newValue } : c));
            setMessage('Configuración actualizada');
            setTimeout(() => setMessage(''), 2000);
        } catch (error) {
            console.error('Error updating config:', error);
            setMessage('Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-brand-blue" /></div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-3 border-b pb-4">
                <div className="p-2 bg-brand-blue/10 rounded-lg text-brand-blue">
                    <Settings size={24} />
                </div>
                <h1 className="text-2xl font-bold text-gray-800">Configuración del Sistema</h1>
            </div>

            {message && (
                <div className={`p-4 rounded-lg ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                    {message}
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 space-y-6">
                    <h2 className="text-lg font-semibold text-gray-700">Consecutivos</h2>
                    <div className="grid gap-6">
                        {configs.map(item => (
                            <div key={item.key} className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-gray-50 rounded-lg">
                                <div className="flex-1">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">
                                        {item.key === 'do_consecutive' ? 'Consecutivo Actual D.O.' :
                                            item.key === 'do_year' ? 'Año Fiscal D.O.' : item.key}
                                    </label>
                                    <p className="text-xs text-gray-500">{item.description}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        className="border rounded-lg px-3 py-2 w-32 text-center font-mono"
                                        value={item.value}
                                        onChange={(e) => {
                                            const newConfigs = configs.map(c => c.key === item.key ? { ...c, value: e.target.value } : c);
                                            setConfigs(newConfigs);
                                        }}
                                    />
                                    <button
                                        onClick={() => handleSave(item.key, item.value)}
                                        disabled={saving}
                                        className="p-2 bg-brand-blue text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                    >
                                        <Save size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="text-sm text-gray-500 bg-blue-50 p-4 rounded-lg">
                        <p>ℹ️ <strong>Nota:</strong> Estos valores se utilizan para generar automáticamente los códigos de las declaraciones. Por ejemplo: <code>DOLS[Consecutivo]-[Año]</code>.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
