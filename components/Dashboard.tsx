import React, { useState } from 'react';
import { Package, Search, Calendar, Filter, Truck, CheckCircle, Clock, FileText } from 'lucide-react';
import { Shipment, User } from '../types';
import { STATUS_COLORS } from '../constants';

interface Props {
  user: User;
  shipments: Shipment[];
}

export const Dashboard: React.FC<Props> = ({ user, shipments }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredShipments = shipments.filter(s => {
    const matchesSearch = s.blNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 text-brand-blue rounded-lg"><Truck size={20} /></div>
            <span className="text-sm text-gray-500 font-medium">En Tránsito</span>
          </div>
          <span className="text-2xl font-bold text-gray-800">{shipments.filter(s => s.status === 'In Transit').length}</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-brand-yellow/20 text-yellow-700 rounded-lg"><Package size={20} /></div>
            <span className="text-sm text-gray-500 font-medium">En Bodega</span>
          </div>
          <span className="text-2xl font-bold text-gray-800">{shipments.filter(s => s.status === 'In Warehouse').length}</span>
        </div>
         <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hidden md:block">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 text-green-700 rounded-lg"><CheckCircle size={20} /></div>
            <span className="text-sm text-gray-500 font-medium">Despachados</span>
          </div>
          <span className="text-2xl font-bold text-gray-800">{shipments.filter(s => s.status === 'Dispatched').length}</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hidden md:block">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gray-100 text-gray-700 rounded-lg"><Clock size={20} /></div>
            <span className="text-sm text-gray-500 font-medium">Total Mes</span>
          </div>
          <span className="text-2xl font-bold text-gray-800">24</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por BL o Cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {['all', 'In Transit', 'In Warehouse', 'Dispatched'].map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filterStatus === st 
                  ? 'bg-brand-blue text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {st === 'all' ? 'Todos' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory List (Mobile Cards / Desktop Table) */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Package className="text-brand-blue" />
            Inventario Actual
        </h2>
        
        {/* Mobile View: Cards */}
        <div className="grid grid-cols-1 md:hidden gap-4">
          {filteredShipments.map(item => (
            <div key={item.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                    <h4 className="font-bold text-gray-800">{item.blNumber}</h4>
                    <p className="text-xs text-gray-500">{item.clientName}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[item.status]}`}>
                  {item.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                <div className="flex items-center gap-1"><FileText size={14}/> {item.invoiceNumber}</div>
                <div className="flex items-center gap-1"><Calendar size={14}/> {item.arrivalDate}</div>
              </div>
              <div className="pt-2 border-t border-gray-50">
                  <p className="text-sm font-medium text-gray-700">{item.items[0]?.description} ({item.items[0]?.quantity} unds)</p>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">BL Number</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Factura</th>
                <th className="px-6 py-4">Ingreso</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Mercancía</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredShipments.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-800">{item.blNumber}</td>
                  <td className="px-6 py-4 text-gray-600">{item.clientName}</td>
                  <td className="px-6 py-4 text-gray-600">{item.invoiceNumber}</td>
                  <td className="px-6 py-4 text-gray-600">{item.arrivalDate}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[item.status]}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600 truncate max-w-xs">{item.items[0]?.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredShipments.length === 0 && (
            <div className="p-8 text-center text-gray-400">
                No se encontraron envíos.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};