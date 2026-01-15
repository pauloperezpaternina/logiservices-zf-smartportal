import React, { useEffect, useState } from 'react';
import { Package, Warehouse, LayoutDashboard, TrendingUp } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { InventoryItem } from '../../types';

export const InventoryDashboard: React.FC = () => {
    const [stats, setStats] = useState({
        totalBultos: 0,
        totalPeso: 0,
        totalReferences: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const data = await inventoryService.getInventory();

            const totalBultos = data.reduce((sum, item: any) => sum + Number(item.cantidad_bultos), 0);
            const totalPeso = data.reduce((sum, item: any) => sum + Number(item.peso_actual), 0);

            setStats({
                totalBultos,
                totalPeso,
                totalReferences: data.length
            });
        } catch (error) {
            console.error("Error loading inventory stats", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Cargando estadísticas...</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-brand-blue rounded-lg">
                    <Package size={24} />
                </div>
                <div>
                    <p className="text-sm text-gray-500">Total Bultos</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalBultos.toLocaleString()}</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                    <Warehouse size={24} />
                </div>
                <div>
                    <p className="text-sm text-gray-500">Peso Total (kg)</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalPeso.toLocaleString()}</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
                    <TrendingUp size={24} />
                </div>
                <div>
                    <p className="text-sm text-gray-500">Referencias/DOs</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalReferences}</p>
                </div>
            </div>
        </div>
    );
};
