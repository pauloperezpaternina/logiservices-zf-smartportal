
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

import { UsersModule } from './components/UsersModule';
import { RolesModule } from './components/RolesModule';
import { UserProfile } from './components/UserProfile';

// Simplified Admin Dashboard (Just the content)
const AdminDashboard = ({ user, shipments, onAddShipment }: { user: User, shipments: Shipment[], onAddShipment: () => void }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <Dashboard user={user} shipments={shipments} />
      </div>
      <div className="lg:col-span-1">
        <ShipmentForm onSuccess={onAddShipment} />
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>(MOCK_SHIPMENTS);
  const [currentView, setCurrentView] = useState('dashboard');

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

  const renderContent = () => {
    switch (currentView) {
      case 'entidades': return <EntidadesModule />;
      case 'dordenes': return <DOrdenesModule />;
      case 'users': return <UsersModule />;
      case 'roles': return <RolesModule />;
      case 'profile': return <UserProfile user={user} />;
      case 'dashboard':
      default:
        // Admin gets the full dashboard, Clients get their simple dashboard
        if (user.role === 'administrator') {
          return <AdminDashboard user={user} shipments={shipments} onAddShipment={handleAddShipment} />;
        }
        return <Dashboard user={user} shipments={shipments} />;
    }
  };

  return (
    <Layout
      user={user}
      onLogout={() => setUser(null)}
      currentView={currentView}
      onNavigate={setCurrentView}
    >
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Welcome Section (Only on Dashboard) */}
        {currentView === 'dashboard' && (
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
        )}

        {/* Content Area */}
        {renderContent()}
      </div>

      {/* AI Assistant (Always available) */}
      <AIChatAssistant shipments={shipments} />
    </Layout>
  );
}