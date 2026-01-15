import React, { useEffect, useState } from 'react';
import { Package, Warehouse, TrendingUp, BarChart3, PieChart } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RePieChart, Pie, Cell } from 'recharts';

export const InventoryDashboard: React.FC = () => {
    const [stats, setStats] = useState({
        totalBultos: 0,
        totalPeso: 0,
        totalReferences: 0
    });
    const [warehouseData, setWarehouseData] = useState<any[]>([]);
    const [clientData, setClientData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const COLORS = ['#003366', '#FFC107', '#4CAF50', '#FF5722', '#9C27B0', '#00BCD4'];

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const data = await inventoryService.getInventory();

            // KPIs
            const totalBultos = data.reduce((sum, item: any) => sum + Number(item.cantidad_bultos), 0);
            const totalPeso = data.reduce((sum, item: any) => sum + Number(item.peso_actual), 0);

            // Chart 1: Stock by Bodega
            const byBodega: Record<string, number> = {};
            data.forEach((item: any) => {
                const name = item.bodega?.nombre || 'Sin Bodega';
                byBodega[name] = (byBodega[name] || 0) + Number(item.cantidad_bultos);
            });
            const bodegaChartData = Object.entries(byBodega).map(([name, value]) => ({ name, value }));

            // Chart 2: Top Clients by Stock
            const byClient: Record<string, number> = {};
            data.forEach((item: any) => {
                const name = item.d_orden?.cliente?.nombre || 'Desconocido';
                byClient[name] = (byClient[name] || 0) + Number(item.cantidad_bultos);
            });
            const clientChartData = Object.entries(byClient)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 5); // Top 5

            setStats({
                totalBultos,
                totalPeso,
                totalReferences: data.length
            });
            setWarehouseData(bodegaChartData);
            setClientData(clientChartData);

        } catch (error) {
            console.error("Error loading inventory stats", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando análisis de inventario...</div>;

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

            {/* Charts Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Bodega Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-6">
                        <BarChart3 className="text-brand-blue" size={20} />
                        <h3 className="font-bold text-gray-800">Bultos por Bodega</h3>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={warehouseData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ fill: '#f3f4f6' }}
                                />
                                <Bar dataKey="value" fill="#003366" radius={[4, 4, 0, 0]} name="Bultos" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Client Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-6">
                        <PieChart className="text-brand-yellow" size={20} />
                        <h3 className="font-bold text-gray-800">Top 5 Clientes (Bultos)</h3>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                                <Pie
                                    data={clientData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {clientData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip boxStyle={{ borderRadius: '8px' }} />
                                <Legend layout="vertical" align="right" verticalAlign="middle" />
                            </RePieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};
