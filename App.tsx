
import React, { useState } from 'react';
import { supabase } from './services/supabase';
import { Layout } from './components/Layout';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { AIChatAssistant } from './components/AIChatAssistant';
import { EntidadesModule } from './components/EntidadesModule';
import { DOrdenesModule } from './components/DOrdenesModule';
import { User, Shipment } from './types';
import { MOCK_SHIPMENTS } from './constants';
import { LayoutDashboard, Users, FileSpreadsheet } from 'lucide-react';

import { UsersModule } from './components/UsersModule';
import { RolesModule } from './components/RolesModule';
import { UserProfile } from './components/UserProfile';
import { ConfigModule } from './components/ConfigModule';
import { InventoryView } from './components/inventory/InventoryView';

// Simplified Admin Dashboard (Just the content)
const AdminDashboard = ({ user, shipments }: { user: User, shipments: Shipment[] }) => {
  return (
    <div className="w-full">
      <Dashboard user={user} shipments={shipments} />
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>(MOCK_SHIPMENTS);
  const [currentView, setCurrentView] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    let isMounted = true;

    // Safety timeout - never stay loading forever
    const timeout = setTimeout(() => {
      if (isMounted) {
        console.log("Session check timed out, proceeding to login");
        setLoading(false);
      }
    }, 3000);

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout);
      if (!isMounted) return;

      if (session?.user) {
        // Create user without async role fetch for now
        const userData: User = {
          id: session.user.id,
          name: session.user.user_metadata?.nombre || session.user.email?.split('@')[0] || 'Usuario',
          email: session.user.email || '',
          companyName: 'Logiservices ZF',
          role: session.user.user_metadata?.role || 'administrator', // Use metadata or default
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
        };
        setUser(userData);
      }
      setLoading(false);
    }).catch((err) => {
      clearTimeout(timeout);
      console.error("Session error:", err);
      if (isMounted) setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const userData: User = {
          id: session.user.id,
          name: session.user.user_metadata?.nombre || session.user.email?.split('@')[0] || 'Usuario',
          email: session.user.email || '',
          companyName: 'Logiservices ZF',
          role: session.user.user_metadata?.role || 'administrator',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
        };
        setUser(userData);
      } else {
        setUser(null);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center bg-gray-50 text-gray-400">Cargando aplicación...</div>;
  }


  if (!user) {
    return <Auth onLogin={setUser} />;
  }

  const renderContent = () => {
    switch (currentView) {
      case 'entidades': return <EntidadesModule />;
      case 'dordenes': return <DOrdenesModule />;
      case 'inventory': return <InventoryView />;
      case 'users': return <UsersModule />;

      // ... (in switch)
      case 'roles': return <RolesModule />;
      case 'config': return <ConfigModule />;
      case 'profile': return <UserProfile user={user} onUserUpdate={setUser} />;
      case 'dashboard':
      default:
        // Admin gets the full dashboard, Clients get their simple dashboard
        if (user.role === 'administrator') {
          return <AdminDashboard user={user} shipments={shipments} />;
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
                Hola, {user.name}
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