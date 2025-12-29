import React, { useState } from 'react';
import { Menu, X, Home, LogOut, User as UserIcon, Settings, Globe, Users, FileSpreadsheet, LayoutDashboard, ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import { User } from '../types';

interface Props {
  user: User | null;
  onLogout: () => void;
  children: React.ReactNode;
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Layout: React.FC<Props> = ({ user, onLogout, children, currentView, onNavigate }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile toggle
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // Desktop collapse

  if (!user) return <>{children}</>;

  const NavItem = ({ view, icon: Icon, label, requiredRole }: { view: string, icon: any, label: string, requiredRole?: string }) => {
    if (requiredRole && user.role !== requiredRole) return null;

    const isActive = currentView === view;
    return (
      <button
        onClick={() => { onNavigate(view); setIsSidebarOpen(false); }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left group relative
             ${isActive
            ? 'bg-white/10 text-brand-yellow font-medium'
            : 'text-gray-300 hover:bg-white/5 hover:text-white'
          }`}
        title={isSidebarCollapsed ? label : ''}
      >
        <Icon size={20} className="shrink-0" />
        {!isSidebarCollapsed && <span>{label}</span>}
      </button>
    );
  };

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
        className={`fixed md:sticky top-0 left-0 h-screen bg-brand-blue text-white z-50 transform transition-all duration-300 ease-in-out border-r border-white/10
          ${isSidebarCollapsed ? 'w-20' : 'w-80'}
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">

          {/* Sidebar Toggle (Desktop) */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute -right-3 top-10 bg-brand-yellow text-brand-blue p-1 rounded-full shadow-md z-50 hidden md:flex hover:scale-110 transition-transform"
          >
            {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          {/* Logo Area */}
          <div className={`p-6 flex items-center justify-center transition-all duration-300 ${isSidebarCollapsed ? 'px-2' : ''}`}>
            {!isSidebarCollapsed ? (
              <div className="w-full px-4 flex justify-center">
                <img src="/logo.png" alt="Logiservices ZF" className="w-[280px] h-auto object-contain bg-white rounded-lg p-2" />
              </div>
            ) : (
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center p-1">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2 p-4 overflow-y-auto">
            <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />

            {user.role === 'administrator' && (
              <>
                <div className={`text-xs font-semibold text-gray-500 uppercase mt-6 mb-2 ${isSidebarCollapsed ? 'text-center' : 'px-4'}`}>
                  {!isSidebarCollapsed ? 'Administración' : '...'}
                </div>
                <NavItem view="entidades" icon={Users} label="Entidades" requiredRole="administrator" />
                <NavItem view="dordenes" icon={FileSpreadsheet} label="D.Ordenes" requiredRole="administrator" />
                <NavItem view="users" icon={UserIcon} label="Usuarios" requiredRole="administrator" />
                <NavItem view="roles" icon={Shield} label="Roles y Permisos" requiredRole="administrator" />
              </>
            )}
          </nav>

          {/* User Footer */}
          <div className="p-4 bg-brand-blue-dark/20">
            <div
              className={`flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors ${isSidebarCollapsed ? 'justify-center' : ''}`}
              onClick={() => onNavigate('profile')}
            >
              <div className="w-10 h-10 rounded-full bg-brand-yellow text-brand-blue flex items-center justify-center font-bold text-sm shrink-0">
                {user.email.substring(0, 2).toUpperCase()}
              </div>
              {!isSidebarCollapsed && (
                <div className="overflow-hidden text-left flex-1">
                  <p className="text-sm font-medium truncate">{user.companyName}</p>
                  <p className="text-xs text-gray-400 truncate flex items-center">
                    {user.role} <Settings size={10} className="ml-1" />
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={onLogout}
              className={`mt-4 w-full flex items-center gap-2 py-2 text-sm text-red-300 hover:text-red-200 transition-colors ${isSidebarCollapsed ? 'justify-center' : 'px-4'}`}
              title="Cerrar Sesión"
            >
              <LogOut size={18} />
              {!isSidebarCollapsed && 'Cerrar Sesión'}
            </button>
          </div>

        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        {/* Mobile Header */}
        <header className="md:hidden bg-white p-4 shadow-sm flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logiservices ZF" className="h-10 w-auto object-contain" />
          </div>
          <button onClick={() => setIsSidebarOpen(true)} className="text-gray-600">
            <Menu size={24} />
          </button>
        </header>

        {/* Content Body */}
        <div className="p-4 md:p-8 overflow-y-auto flex-1">
          {children}
        </div>
      </main>
    </div>
  );
};