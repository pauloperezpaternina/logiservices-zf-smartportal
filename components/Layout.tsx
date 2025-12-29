import React, { useState } from 'react';
import { Menu, X, Home, LogOut, User as UserIcon, Settings, Globe } from 'lucide-react';
import { User } from '../types';

interface Props {
  user: User | null;
  onLogout: () => void;
  children: React.ReactNode;
}

export const Layout: React.FC<Props> = ({ user, onLogout, children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!user) return <>{children}</>;

  return (
    <div className="min-h-screen bg-brand-light flex">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-brand-blue text-white z-50 transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-6 flex flex-col h-full">
          {/* Logo Area */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0">
               <Globe className="text-brand-blue" size={24} />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight text-white">LOGISERVICES <span className="text-brand-yellow">ZF</span></h1>
              <p className="text-[10px] text-gray-300">SmartPortal v1.0</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            <a href="#" className="flex items-center gap-3 px-4 py-3 bg-white/10 rounded-lg text-brand-yellow font-medium">
              <Home size={20} /> Dashboard
            </a>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white/5 rounded-lg transition-colors">
              <UserIcon size={20} /> Perfil
            </a>
            {user.role === 'admin' && (
              <a href="#" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-white/5 rounded-lg transition-colors">
                <Settings size={20} /> Configuración
              </a>
            )}
          </nav>

          {/* User Footer */}
          <div className="pt-6 border-t border-white/10">
            <div className="flex items-center gap-3 mb-4">
               <div className="w-8 h-8 rounded-full bg-brand-yellow text-brand-blue flex items-center justify-center font-bold text-xs">
                 {user.email.substring(0,2).toUpperCase()}
               </div>
               <div className="overflow-hidden">
                 <p className="text-sm font-medium truncate">{user.companyName}</p>
                 <p className="text-xs text-gray-400 truncate">{user.role}</p>
               </div>
            </div>
            <button 
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-red-300 hover:text-red-200 transition-colors"
            >
              <LogOut size={16} /> Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden bg-white p-4 shadow-sm flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-brand-blue rounded-full flex items-center justify-center">
               <Globe className="text-brand-yellow" size={18} />
             </div>
             <span className="font-bold text-brand-blue">SmartPortal</span>
          </div>
          <button onClick={() => setIsSidebarOpen(true)} className="text-gray-600">
            <Menu size={24} />
          </button>
        </header>

        {/* Content Body */}
        <div className="p-4 md:p-8 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
};