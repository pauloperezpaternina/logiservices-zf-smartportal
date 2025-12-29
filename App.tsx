
import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { ShipmentForm } from './components/ShipmentForm';
import { AIChatAssistant } from './components/AIChatAssistant';
import { EntidadesModule } from './components/EntidadesModule';
import { DOrdenesModule } from './components/DOrdenesModule';
import { User, Shipment } from './types';
import { MOCK_SHIPMENTS } from './constants';
import { LayoutDashboard, Users, FileSpreadsheet } from 'lucide-react';

// Extracted Admin Component to manage tabs state
const AdminDashboard = ({ user, shipments, onAddShipment }: { user: User, shipments: Shipment[], onAddShipment: () => void }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'entidades' | 'dordenes'>('dashboard');

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors ${activeTab === 'dashboard' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          <LayoutDashboard size={18} /> Dashboard
        </button>
        <button
          onClick={() => setActiveTab('entidades')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors ${activeTab === 'entidades' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          <Users size={18} /> Entidades
        </button>
        <button
          onClick={() => setActiveTab('dordenes')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors ${activeTab === 'dordenes' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          <FileSpreadsheet size={18} /> D.Ordenes
        </button>
      </div>

      {/* Content */}
      <div className="animate-in fade-in zoom-in-95 duration-200">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Dashboard user={user} shipments={shipments} />
            </div>
            <div className="lg:col-span-1">
              <ShipmentForm onSuccess={onAddShipment} />
            </div>
          </div>
        )}
        {activeTab === 'entidades' && <EntidadesModule />}
        {activeTab === 'dordenes' && <DOrdenesModule />}
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>(MOCK_SHIPMENTS);

  // Add a new shipment (Mock)
  const handleAddShipment = () => {
    const newShipment: Shipment = {
      id: Date.now().toString(),
      blNumber: 'BL-NEW-ENTRY',
      invoiceNumber: 'INV-PENDING',
      vcesCode: 'VCES-NEW',
      status: 'In Warehouse',
      arrivalDate: new Date().toISOString().split('T')[0],
      clientName: user?.companyName || 'Unknown',
      items: [{ id: 'i-new', description: 'Mercancía Reciente', quantity: 0, weight: 0 }],
      documents: []
    };
    setShipments(prev => [newShipment, ...prev]);
  };

  if (!user) {
    return <Auth onLogin={setUser} />;
  }

  return (
    <Layout user={user} onLogout={() => setUser(null)}>
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Hola, {user.companyName}
            </h2>
            <p className="text-gray-500">Aquí está el resumen de tu operación logística.</p>
          </div>
          <div className="text-sm text-gray-400 bg-white px-3 py-1 rounded-full shadow-sm">
            {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Operational Area (Admin Only) */}
        {user.role === 'admin' && (
          <AdminDashboard
            user={user}
            shipments={shipments}
            onAddShipment={handleAddShipment}
          />
        )}

        {/* Client View */}
        {user.role === 'client' && (
          <Dashboard user={user} shipments={shipments} />
        )}
      </div>

      {/* AI Assistant (Always available) */}
      <AIChatAssistant shipments={shipments} />
    </Layout>
  );
}