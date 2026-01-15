import React, { useState } from 'react';
import { LayoutDashboard, List, PieChart } from 'lucide-react';
import { InventoryDashboard } from './InventoryDashboard';
import { InventoryList } from './InventoryList';

export const InventoryView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'list'>('dashboard');

    return (
        <div className="space-y-6">
            {/* Header / Tabs */}
            <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 inline-flex gap-1">
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'dashboard'
                            ? 'bg-brand-blue text-white shadow-sm'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                >
                    <PieChart size={18} />
                    <span>Gráficos y Estadísticas</span>
                </button>
                <button
                    onClick={() => setActiveTab('list')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'list'
                            ? 'bg-brand-blue text-white shadow-sm'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                >
                    <List size={18} />
                    <span>Datos de Inventario</span>
                </button>
            </div>

            {/* Content */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === 'dashboard' ? (
                    <InventoryDashboard />
                ) : (
                    <InventoryList />
                )}
            </div>
        </div>
    );
};
