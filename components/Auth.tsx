import React, { useState } from 'react';
import { Globe, Lock, Mail, ArrowRight } from 'lucide-react';
import { User, UserRole } from '../types';

interface Props {
  onLogin: (user: User) => void;
}

export const Auth: React.FC<Props> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('admin');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate Login
    const mockUser: User = {
      id: '1',
      email: email || 'user@logiservices.com',
      role: role,
      companyName: role === 'admin' ? 'Logiservices ZF' : 'Cliente Externo SAS',
    };
    onLogin(mockUser);
  };

  return (
    <div className="min-h-screen bg-brand-light flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-brand-blue p-8 text-center relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
           <div className="relative z-10 flex flex-col items-center">
             <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg">
                <Globe className="text-brand-blue" size={32} />
             </div>
             <h2 className="text-2xl font-bold text-white">Bienvenido</h2>
             <p className="text-brand-yellow font-medium">Logiservices ZF SmartPortal</p>
           </div>
        </div>

        {/* Form */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all"
                  placeholder="nombre@empresa.com"
                />
              </div>
            </div>

            <div className="space-y-2">
               <label className="text-sm font-medium text-gray-700">Contraseña</label>
               <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="password"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Role Switcher (For Demo Purposes) */}
            <div className="p-3 bg-gray-50 rounded-lg flex justify-between items-center text-sm">
              <span className="text-gray-500">Rol (Demo):</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`px-3 py-1 rounded transition-colors ${role === 'admin' ? 'bg-brand-blue text-white' : 'bg-gray-200 text-gray-600'}`}
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => setRole('client')}
                  className={`px-3 py-1 rounded transition-colors ${role === 'client' ? 'bg-brand-blue text-white' : 'bg-gray-200 text-gray-600'}`}
                >
                  Cliente
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-brand-yellow text-brand-blue font-bold py-3 rounded-lg shadow hover:bg-yellow-400 hover:shadow-md transition-all flex justify-center items-center gap-2 group"
            >
              Ingresar al Portal
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};