import React, { useEffect, useState } from 'react';
import { Search, Filter, Package } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { InventoryItem } from '../../types';

export const InventoryList: React.FC = () => {
    const [inventory, setInventory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        loadInventory();
    }, [searchTerm]);

    // Reset page when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const loadInventory = async () => {
        setLoading(true);
        try {
            const data = await inventoryService.getInventory({ search: searchTerm });
            setInventory(data);
        } catch (error) {
            console.error("Error loading inventory", error);
        } finally {
            setLoading(false);
        }
    };

    // Paginacion
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = inventory.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(inventory.length / itemsPerPage);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                    <Package size={20} className="text-brand-blue" />
                    Inventario Detallado
                </h3>

                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por DO, Cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none"
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                        <tr>
                            <th className="px-6 py-4 font-semibold">D.O. / Cliente</th>
                            <th className="px-6 py-4 font-semibold">Producto</th>
                            <th className="px-6 py-4 font-semibold">Bodega</th>
                            <th className="px-6 py-4 font-semibold text-right">Bultos</th>
                            <th className="px-6 py-4 font-semibold text-right">Peso (kg)</th>
                            <th className="px-6 py-4 font-semibold text-center">Última Actualización</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Cargando inventario...</td></tr>
                        ) : inventory.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No se encontraron registros de inventario.</td></tr>
                        ) : (
                            currentItems.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-brand-blue">{item.d_orden?.do_code}</div>
                                        <div className="text-xs text-gray-500">{item.d_orden?.cliente?.nombre || 'Cliente Desconocido'}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {item.d_orden?.producto}
                                        <div className="text-xs text-gray-400">{item.d_orden?.bl_no}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                            {item.bodega?.nombre}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                                        {item.cantidad_bultos}
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-600">
                                        {item.peso_actual}
                                    </td>
                                    <td className="px-6 py-4 text-center text-xs text-gray-400">
                                        {new Date(item.updated_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination UI */}
            {!loading && inventory.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                            <span>Mostrar:</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => {
                                    setItemsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="bg-white border border-gray-200 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-brand-blue/20"
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                        <span>Mostrando {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, inventory.length)} de {inventory.length}</span>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-white hover:shadow-sm disabled:opacity-50 disabled:hover:shadow-none transition-all text-sm"
                        >
                            Anterior
                        </button>

                        <div className="flex items-center gap-1 mx-2">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                // Logic to show window of pages around current
                                let p = i + 1;
                                if (totalPages > 5) {
                                    if (currentPage > 3) p = currentPage - 2 + i;
                                    if (p > totalPages) p = totalPages - 4 + i;
                                }
                                return p;
                            }).map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${currentPage === page
                                            ? 'bg-brand-blue text-white shadow-sm'
                                            : 'text-gray-500 hover:bg-white hover:shadow-sm'
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-white hover:shadow-sm disabled:opacity-50 disabled:hover:shadow-none transition-all text-sm"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
