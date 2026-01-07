import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { SearchableSelect } from './SearchableSelect';
import { Save, Loader2, FileSpreadsheet, Search, Plus, ArrowLeft, Edit, Trash2, Calendar, Package, FileText, CheckCircle, XCircle, TrendingUp, X, LayoutGrid, LayoutList } from 'lucide-react';

interface Entidad {
    id: string;
    nombre: string;
}

interface DOrdenMovimiento {
    id?: string;
    d_orden_id: string;
    tipo: 'ingreso' | 'salida';
    placa: string;
    fecha_hora: string;
    conductor: string;
    bultos: number;
    peso_bruto: number;
    formulario_ref?: string;
    estado: 'total' | 'parcial';
    created_at?: string;
}

interface DOrden {
    id: string;
    created_at?: string;
    do_code: string;
    producto: string;
    bl_no: string;
    client_id_entidad: string;
    agencia_aduana_id: string;

    // Foreign Tables
    cliente?: { nombre: string };
    agencia?: { nombre: string };
    movimientos?: DOrdenMovimiento[];

    // Logistics / Status
    form_ingreso: string;
    liberacion_bl: string;
    pago_facturas_transporte: string;
    entrega_planilla_zf: string; // M/D/A
    traslado_zf: string; // M/D/A
    legalizacion_ingreso: string;
    proforma_ingreso: string;
    preinspeccion: string;
    form_salida: string;
    cargue_salida_mercancia: string; // M/D/A
    bultos: number;
    bodega: string;
    fecha_facturacion_almacenaje: string;
    observaciones: string;
    activo: boolean;
    // Legacy support if needed
    client_id?: string;
}

export const DOrdenesModule: React.FC = () => {
    const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [gridCols, setGridCols] = useState<1 | 2>(2);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Data List
    const [dOrdenes, setDOrdenes] = useState<DOrden[]>([]);
    const [movimientos, setMovimientos] = useState<DOrdenMovimiento[]>([]);

    // Movement Form State
    const [newMov, setNewMov] = useState<DOrdenMovimiento>({
        d_orden_id: '',
        tipo: 'ingreso',
        placa: '',
        fecha_hora: new Date().toISOString().slice(0, 16),
        conductor: '',
        bultos: 0,
        peso_bruto: 0,
        formulario_ref: '',
        estado: 'total'
    });

    // Entity Options
    const [clientes, setClientes] = useState<Entidad[]>([]);
    const [agencias, setAgencias] = useState<Entidad[]>([]);

    // Form State
    const [formData, setFormData] = useState<DOrden>({
        id: '',
        do_code: '',
        producto: '',
        bl_no: '',
        client_id_entidad: '',
        agencia_aduana_id: '',
        form_ingreso: '',
        liberacion_bl: '',
        pago_facturas_transporte: '',
        entrega_planilla_zf: '',
        traslado_zf: '',
        legalizacion_ingreso: '',
        proforma_ingreso: '',
        preinspeccion: '',
        form_salida: '',
        cargue_salida_mercancia: '',
        bultos: 0,
        bodega: '',
        fecha_facturacion_almacenaje: '',
        observaciones: '',
        activo: true
    });

    useEffect(() => {
        fetchEntidades();
        fetchDOrdenes();
    }, []);

    useEffect(() => {
        if (view === 'list') {
            fetchDOrdenes();
            setCurrentPage(1); // Reset to first page on search
        }
    }, [view, searchTerm]);

    const fetchEntidades = async () => {
        try {
            // Fetch Clients
            const { data: dataClients } = await supabase
                .from('entidades')
                .select('id, nombre')
                .eq('es_cliente', true)
                .order('nombre');
            setClientes(dataClients || []);

            // Fetch Agencies
            const { data: dataAgencies } = await supabase
                .from('entidades')
                .select('id, nombre')
                .eq('es_agencia', true)
                .order('nombre');
            setAgencias(dataAgencies || []);
        } catch (error) {
            console.error('Error fetching entities for dropdowns:', error);
        }
    };

    const fetchDOrdenes = async () => {
        setLoading(true);
        try {
            // We use standard joining. Note: exact relation names might vary if multiple FKs exist.
            // Assuming default naming convention or that we can alias by column.
            let query = supabase
                .from('d_ordenes')
                .select(`
                    *,
                    cliente:entidades!client_id_entidad(nombre),
                    agencia:entidades!agencia_aduana_id(nombre),
                    movimientos:d_ordenes_movimientos(*)
                `)
                .order('created_at', { ascending: false });

            if (searchTerm) {
                // To search in related tables, supabase needs specific syntax or flattened view. 
                // Simple search on local columns first.
                query = query.or(`do_code.ilike.%${searchTerm}%,producto.ilike.%${searchTerm}%,bl_no.ilike.%${searchTerm}%`);
            }

            const { data, error } = await query;

            if (error) {
                // Fallback if the relation alias fails (e.g. if FK names are tricky)
                console.warn("Join failed, trying simple fetch", error);
                const { data: simpleData, error: simpleError } = await supabase
                    .from('d_ordenes')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (simpleError) throw simpleError;

                // We won't have names, but at least we have data. 
                // We could map ids to names manually using `clientes` and `agencias` state.
                // Note: clientes/agencias might not be loaded yet if useEffect runs in parallel, but usually fast enough.
                const enriched = simpleData?.map(d => ({
                    ...d,
                    cliente: { nombre: clientes.find(c => c.id === d.client_id_entidad)?.nombre || '---' },
                    agencia: { nombre: agencias.find(a => a.id === d.agencia_aduana_id)?.nombre || '---' }
                }));
                setDOrdenes(enriched as DOrden[]);
            } else {
                setDOrdenes(data as DOrden[]);
            }
        } catch (error) {
            console.error('Error fetching d_ordenes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSuccessMsg('');

        try {
            // Prepare payload
            const payload: any = {
                do_code: formData.do_code,
                producto: formData.producto,
                bl_no: formData.bl_no,
                client_id_entidad: formData.client_id_entidad,
                client_id: formData.client_id_entidad, // Satisfy legacy
                agencia_aduana_id: formData.agencia_aduana_id,
                form_ingreso: formData.form_ingreso,
                liberacion_bl: formData.liberacion_bl,
                pago_facturas_transporte: formData.pago_facturas_transporte,
                entrega_planilla_zf: formData.entrega_planilla_zf || null,
                traslado_zf: formData.traslado_zf || null,
                legalizacion_ingreso: formData.legalizacion_ingreso,
                proforma_ingreso: formData.proforma_ingreso,
                preinspeccion: formData.preinspeccion,
                form_salida: formData.form_salida,
                cargue_salida_mercancia: formData.cargue_salida_mercancia || null,
                bultos: formData.bultos,
                bodega: formData.bodega,
                fecha_facturacion_almacenaje: formData.fecha_facturacion_almacenaje || null,
                observaciones: formData.observaciones,
                activo: formData.activo
            };

            let error;
            if (formData.id) {
                const { error: updateError } = await supabase
                    .from('d_ordenes')
                    .update(payload)
                    .eq('id', formData.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('d_ordenes')
                    .insert([payload]);
                error = insertError;
            }

            if (error) throw error;

            // Update consecutive if new record
            if (!formData.id) {
                // We crudely increment the config. Ideally use an RPC for atomicity.
                // Fetch current first to be safe or just increment
                const { data: config } = await supabase
                    .from('app_configuration')
                    .select('value')
                    .eq('key', 'do_consecutive')
                    .single();

                if (config) {
                    const current = parseInt(config.value);
                    if (!isNaN(current)) {
                        await supabase
                            .from('app_configuration')
                            .update({ value: (current + 1).toString() })
                            .eq('key', 'do_consecutive');
                    }
                }
            }

            setSuccessMsg(formData.id ? 'D.O. actualizada correctamente' : 'D.O. creada exitosamente');
            setTimeout(() => {
                setSuccessMsg('');
                setView('list');
                fetchDOrdenes();
            }, 1000);

        } catch (error: any) {
            console.error('Error saving d_orden:', error);
            alert('Error al guardar: ' + (error.message || error));
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = async (item: DOrden) => {
        setFormData({
            ...item,
            form_ingreso: item.form_ingreso || '',
            liberacion_bl: item.liberacion_bl || '',
            pago_facturas_transporte: item.pago_facturas_transporte || '',
            entrega_planilla_zf: item.entrega_planilla_zf || '',
            traslado_zf: item.traslado_zf || '',
            legalizacion_ingreso: item.legalizacion_ingreso || '',
            proforma_ingreso: item.proforma_ingreso || '',
            preinspeccion: item.preinspeccion || '',
            form_salida: item.form_salida || '',
            cargue_salida_mercancia: item.cargue_salida_mercancia || '',
            bultos: item.bultos || 0,
            bodega: item.bodega || '',
            fecha_facturacion_almacenaje: item.fecha_facturacion_almacenaje || '',
            observaciones: item.observaciones || '',
        });

        // Fetch movements
        const { data, error } = await supabase
            .from('d_ordenes_movimientos')
            .select('*')
            .eq('d_orden_id', item.id)
            .order('fecha_hora', { ascending: false });

        if (!error && data) {
            setMovimientos(data as DOrdenMovimiento[]);
        }

        setNewMov(prev => ({ ...prev, d_orden_id: item.id }));
        setView('edit');
    };

    const handleSaveMovimiento = async () => {
        if (!newMov.placa || !newMov.conductor || newMov.bultos <= 0) {
            alert('Por favor complete los campos obligatorios del movimiento');
            return;
        }

        try {
            let error;
            if (newMov.id) {
                // Update
                const { error: updateError } = await supabase
                    .from('d_ordenes_movimientos')
                    .update({
                        tipo: newMov.tipo,
                        placa: newMov.placa,
                        fecha_hora: newMov.fecha_hora,
                        conductor: newMov.conductor,
                        bultos: newMov.bultos,
                        peso_bruto: newMov.peso_bruto,
                        formulario_ref: newMov.formulario_ref,
                        estado: newMov.estado
                    })
                    .eq('id', newMov.id);
                error = updateError;
            } else {
                // Insert
                const { error: insertError } = await supabase
                    .from('d_ordenes_movimientos')
                    .insert([newMov]);
                error = insertError;
            }

            if (error) throw error;

            alert(newMov.id ? 'Movimiento actualizado' : 'Movimiento registrado correctamente');

            // Refresh movements
            const { data } = await supabase
                .from('d_ordenes_movimientos')
                .select('*')
                .eq('d_orden_id', formData.id)
                .order('fecha_hora', { ascending: false });

            setMovimientos(data || []);

            // Clear mini form
            setNewMov({
                d_orden_id: formData.id,
                tipo: 'ingreso',
                placa: '',
                fecha_hora: new Date().toISOString().slice(0, 16),
                conductor: '',
                bultos: 0,
                peso_bruto: 0,
                formulario_ref: '',
                estado: 'total'
            });
        } catch (error: any) {
            alert('Error al procesar movimiento: ' + error.message);
        }
    };

    const handleEditMovimiento = (m: DOrdenMovimiento) => {
        setNewMov({
            ...m,
            fecha_hora: m.fecha_hora ? new Date(m.fecha_hora).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)
        });
    };

    const handleDeleteMovimiento = async (id: string) => {
        if (!confirm('¿Seguro que desea eliminar este movimiento?')) return;
        try {
            const { error } = await supabase.from('d_ordenes_movimientos').delete().eq('id', id);
            if (error) throw error;
            setMovimientos(prev => prev.filter(m => m.id !== id));
        } catch (error: any) {
            alert('Error al eliminar: ' + error.message);
        }
    };

    const toOptions = (list: Entidad[]) => list.map(i => ({ id: i.id, label: i.nombre }));

    // --- RENDER HELPERS ---

    // A small pill component for logistics status fields
    const InfoPill = ({ label, value }: { label: string, value: string }) => {
        if (!value) return <div className="hidden"></div>;
        return (
            <div className="flex flex-col bg-gray-50 p-2 rounded border border-gray-100 min-w-[100px]">
                <span className="text-[10px] uppercase font-semibold text-gray-400 mb-1">{label}</span>
                <span className="text-xs font-medium text-gray-700 truncate" title={value}>{value}</span>
            </div>
        );
    };

    if (view === 'list') {
        // Logic for client-side pagination
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        const currentItems = dOrdenes.slice(indexOfFirstItem, indexOfLastItem);
        const totalPages = Math.ceil(dOrdenes.length / itemsPerPage);

        return (
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-blue/10 rounded-lg text-brand-blue">
                            <FileSpreadsheet size={24} />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">Control de D.Ordenes</h2>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar DO, BL, Producto..."
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-blue/20 outline-none"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Layout Toggle */}
                        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => setGridCols(1)}
                                className={`p-1.5 rounded transition-all ${gridCols === 1 ? 'bg-white shadow-sm text-brand-blue' : 'text-gray-400 hover:text-gray-600'}`}
                                title="Vista Lista"
                            >
                                <LayoutList size={18} />
                            </button>
                            <button
                                onClick={() => setGridCols(2)}
                                className={`p-1.5 rounded transition-all ${gridCols === 2 ? 'bg-white shadow-sm text-brand-blue' : 'text-gray-400 hover:text-gray-600'}`}
                                title="Vista Cuadrícula"
                            >
                                <LayoutGrid size={18} />
                            </button>
                        </div>

                        <button
                            onClick={async () => {
                                // Fetch next code
                                let nextCode = '';
                                try {
                                    const { data } = await supabase.from('app_configuration').select('*');
                                    const cons = data?.find(k => k.key === 'do_consecutive')?.value || '1000';
                                    const year = data?.find(k => k.key === 'do_year')?.value || new Date().getFullYear().toString();
                                    nextCode = `DOLS${cons}-${year}`;
                                } catch (e) {
                                    console.error('Error generating code', e);
                                }

                                setFormData({
                                    id: '', do_code: nextCode, producto: '', bl_no: '', client_id_entidad: '',
                                    agencia_aduana_id: '', form_ingreso: '', liberacion_bl: '', pago_facturas_transporte: '',
                                    entrega_planilla_zf: '', traslado_zf: '', legalizacion_ingreso: '', proforma_ingreso: '',
                                    preinspeccion: '', form_salida: '', cargue_salida_mercancia: '', bultos: 0, bodega: '',
                                    fecha_facturacion_almacenaje: '', observaciones: '', activo: true
                                });
                                setView('create');
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-blue-900 transition-colors"
                        >
                            <Plus size={18} />
                            <span>Nueva D.O.</span>
                        </button>
                    </div>
                </div>

                {/* List of Cards */}
                {loading && dOrdenes.length === 0 ? (
                    <div className="flex justify-center py-12 text-gray-400">
                        <Loader2 className="animate-spin" size={32} />
                    </div>
                ) : (
                    <>
                        <div className={`grid gap-4 ${gridCols === 2 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                            {currentItems.map(item => (
                                <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-5 relative overflow-hidden group">
                                    {/* Status Indicator (Left Border) */}
                                    <div className={`absolute top-0 left-0 w-1.5 h-full ${item.activo ? 'bg-green-600' : 'bg-gray-300'}`}></div>

                                    <div className="flex flex-col gap-4">
                                        {/* Row 1: Header */}
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-xl font-bold text-brand-blue tracking-tight">{item.do_code}</h3>
                                                    {item.bodega && (
                                                        <span className="bg-brand-blue/10 text-brand-blue px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                                                            {item.bodega}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm font-medium text-gray-400 uppercase tracking-tight">{item.producto}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {item.activo && <CheckCircle size={22} className="text-green-500" />}
                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    className="p-2 text-gray-300 hover:text-brand-blue hover:bg-blue-50 rounded-lg transition-colors border border-transparent opacity-0 group-hover:opacity-100"
                                                    title="Editar"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Core Details (BL, Bultos) */}
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <FileText size={16} className="text-gray-400" />
                                                <span className="text-sm font-normal">BL: <span className="text-gray-900 font-semibold">{item.bl_no}</span></span>
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <Package size={16} className="text-gray-400" />
                                                <span className="text-sm font-normal">Bultos: <span className="text-gray-900 font-semibold">{item.bultos}</span></span>
                                            </div>
                                        </div>

                                        <div className="h-px bg-gray-50 flex-1"></div>

                                        {/* Entities Section */}
                                        <div className="space-y-3">
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5">Cliente</p>
                                                <p className="text-sm font-bold text-gray-800" title={item.cliente?.nombre}>{item.cliente?.nombre || '---'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5">Agencia</p>
                                                <p className="text-sm font-bold text-gray-800" title={item.agencia?.nombre}>{item.agencia?.nombre || '---'}</p>
                                            </div>
                                        </div>

                                        {/* Logistics & Movements (Extended Data) */}
                                        <div className="space-y-4 pt-2 border-t border-gray-50 mt-auto">
                                            {/* Rastro Logístico (Grid) */}
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Rastro Logístico</h4>
                                                    <div className="h-[1px] bg-gray-100 flex-1"></div>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                    <InfoPill label="Planilla ZF" value={item.entrega_planilla_zf} />
                                                    <InfoPill label="Form. Salida" value={item.form_salida} />
                                                    <InfoPill label="Lib. BL" value={item.liberacion_bl} />
                                                </div>
                                            </div>

                                            {/* Recent Movements Summary */}
                                            {item.movimientos && item.movimientos.length > 0 && (
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Movimientos</h4>
                                                        <div className="h-[1px] bg-gray-100 flex-1"></div>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        {item.movimientos.slice(0, 2).map((m, idx) => (
                                                            <div key={idx} className={`flex items-center justify-between p-2 rounded-lg border text-[10px] ${m.tipo === 'ingreso' ? 'bg-green-50/50 border-green-100' : 'bg-orange-50/50 border-orange-100'}`}>
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`px-1 rounded-[4px] font-bold uppercase text-[8px] ${m.tipo === 'ingreso' ? 'bg-green-200 text-green-700' : 'bg-orange-200 text-orange-700'}`}>
                                                                        {m.tipo === 'ingreso' ? 'INC' : 'OUT'}
                                                                    </span>
                                                                    <span className="font-semibold text-gray-700">{m.placa}</span>
                                                                    <span className="text-gray-400">|</span>
                                                                    <span className="text-gray-500 font-medium">{new Date(m.fecha_hora).toLocaleDateString()}</span>
                                                                </div>
                                                                <div className="flex gap-3 font-bold">
                                                                    <span className={m.tipo === 'ingreso' ? 'text-green-600' : 'text-orange-600'}>
                                                                        {m.tipo === 'ingreso' ? '+' : '-'}{m.bultos} <span className="text-[8px] font-semibold opacity-60">BULT.</span>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {item.movimientos.length > 2 && (
                                                            <button
                                                                onClick={() => handleEdit(item)}
                                                                className="w-full text-center text-[9px] font-bold text-brand-blue hover:underline uppercase tracking-tighter pt-1"
                                                            >
                                                                Ver {item.movimientos.length - 2} movimientos más
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Observations */}
                                            {item.observaciones && (
                                                <div className="pt-2 flex items-start gap-2">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Obs:</span>
                                                    <p className="text-[10px] text-gray-500 italic truncate" title={item.observaciones}>
                                                        {item.observaciones}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination UI */}
                        {dOrdenes.length > 0 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-gray-100">
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <div className="flex items-center gap-2">
                                        <span>Mostrar:</span>
                                        <select
                                            value={itemsPerPage}
                                            onChange={(e) => {
                                                setItemsPerPage(Number(e.target.value));
                                                setCurrentPage(1);
                                            }}
                                            className="bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-brand-blue/20"
                                        >
                                            <option value={10}>10</option>
                                            <option value={20}>20</option>
                                            <option value={30}>30</option>
                                        </select>
                                    </div>
                                    <span>Mostrando {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, dOrdenes.length)} de {dOrdenes.length}</span>
                                </div>

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                    >
                                        Anterior
                                    </button>

                                    <div className="flex items-center gap-1 mx-2">
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                                            // Simple pagination logic to show limited page numbers
                                            if (
                                                page === 1 ||
                                                page === totalPages ||
                                                (page >= currentPage - 1 && page <= currentPage + 1)
                                            ) {
                                                return (
                                                    <button
                                                        key={page}
                                                        onClick={() => setCurrentPage(page)}
                                                        className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-all ${currentPage === page
                                                            ? 'bg-brand-blue text-white shadow-md'
                                                            : 'text-gray-500 hover:bg-gray-100'
                                                            }`}
                                                    >
                                                        {page}
                                                    </button>
                                                );
                                            } else if (
                                                page === currentPage - 2 ||
                                                page === currentPage + 2
                                            ) {
                                                return <span key={page} className="text-gray-300">...</span>;
                                            }
                                            return null;
                                        })}
                                    </div>

                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                    >
                                        Siguiente
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
                {dOrdenes.length === 0 && !loading && (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <p className="text-gray-500">No se encontraron órdenes.</p>
                    </div>
                )}
            </div>
        );
    }

    // View: Create or Edit
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setView('list')}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div className="p-2 bg-brand-blue/10 rounded-lg text-brand-blue">
                        <FileSpreadsheet size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">
                        {view === 'create' ? 'Nueva D.Orden' : 'Control de D.Orden'}
                    </h2>
                </div>
            </div>

            {successMsg && (
                <div className="p-4 bg-green-50 text-green-700 rounded-lg border border-green-200 mb-4 animate-in fade-in slide-in-from-top-2">
                    {successMsg}
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-8">
                {/* Section 1: Basic Info */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b">Información Principal</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">D.O. (Consecutivo)</label>
                            <input
                                type="text"
                                required
                                disabled
                                className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-blue/20 bg-gray-100 text-gray-500 cursor-not-allowed"
                                value={formData.do_code}
                                onChange={e => setFormData({ ...formData, do_code: e.target.value })}
                                placeholder="Ej. DO-2024-001"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Carga / Producto</label>
                            <input
                                type="text"
                                required
                                className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-blue/20"
                                value={formData.producto}
                                onChange={e => setFormData({ ...formData, producto: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">BL No.</label>
                            <input
                                type="text"
                                className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-blue/20"
                                value={formData.bl_no}
                                onChange={e => setFormData({ ...formData, bl_no: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Section 2: Entities */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <SearchableSelect
                        label="Cliente"
                        placeholder="Buscar Cliente..."
                        options={toOptions(clientes)}
                        value={formData.client_id_entidad}
                        onChange={(val) => setFormData({ ...formData, client_id_entidad: val || '' })}
                    />
                    <SearchableSelect
                        label="Agencia de Aduanas"
                        placeholder="Buscar Agencia..."
                        options={toOptions(agencias)}
                        value={formData.agencia_aduana_id}
                        onChange={(val) => setFormData({ ...formData, agencia_aduana_id: val || '' })}
                    />
                </div>

                {/* Section 3: Status / Logistics */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b">Estatus Logístico</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

                        {/* Row 1 */}
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Form. Ingreso</label>
                            <input type="text" className="w-full border rounded p-2 text-sm"
                                value={formData.form_ingreso} onChange={e => setFormData({ ...formData, form_ingreso: e.target.value })} />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Liberación BL</label>
                            <input type="text" className="w-full border rounded p-2 text-sm"
                                value={formData.liberacion_bl} onChange={e => setFormData({ ...formData, liberacion_bl: e.target.value })} />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pago Fact. Transp.</label>
                            <input type="text" className="w-full border rounded p-2 text-sm"
                                value={formData.pago_facturas_transporte} onChange={e => setFormData({ ...formData, pago_facturas_transporte: e.target.value })} />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Preinspección</label>
                            <input type="text" className="w-full border rounded p-2 text-sm"
                                value={formData.preinspeccion} onChange={e => setFormData({ ...formData, preinspeccion: e.target.value })} />
                        </div>

                        {/* Row 2 */}
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Entrega Planilla ZF</label>
                            <input type="date" className="w-full border rounded p-2 text-sm"
                                value={formData.entrega_planilla_zf} onChange={e => setFormData({ ...formData, entrega_planilla_zf: e.target.value })} />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Traslado a ZF</label>
                            <input type="date" className="w-full border rounded p-2 text-sm"
                                value={formData.traslado_zf} onChange={e => setFormData({ ...formData, traslado_zf: e.target.value })} />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Legaliz. Ingreso</label>
                            <input type="text" className="w-full border rounded p-2 text-sm"
                                value={formData.legalizacion_ingreso} onChange={e => setFormData({ ...formData, legalizacion_ingreso: e.target.value })} />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Proforma Ingreso</label>
                            <input type="text" className="w-full border rounded p-2 text-sm"
                                value={formData.proforma_ingreso} onChange={e => setFormData({ ...formData, proforma_ingreso: e.target.value })} />
                        </div>

                        {/* Row 3 */}
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Form. Salida</label>
                            <input type="text" className="w-full border rounded p-2 text-sm"
                                value={formData.form_salida} onChange={e => setFormData({ ...formData, form_salida: e.target.value })} />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cargue/Salida</label>
                            <input type="date" className="w-full border rounded p-2 text-sm"
                                value={formData.cargue_salida_mercancia} onChange={e => setFormData({ ...formData, cargue_salida_mercancia: e.target.value })} />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bultos</label>
                            <input type="number" className="w-full border rounded p-2 text-sm"
                                value={formData.bultos} onChange={e => setFormData({ ...formData, bultos: Number(e.target.value) })} />
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bodega</label>
                            <select
                                className="w-full border rounded p-2 text-sm outline-none focus:ring-2 focus:ring-brand-blue/20"
                                value={formData.bodega}
                                onChange={e => setFormData({ ...formData, bodega: e.target.value })}
                            >
                                <option value="">Selección...</option>
                                <option value="D13">D13</option>
                                <option value="CA1-CA2">CA1-CA2</option>
                                <option value="PATIO">PATIO</option>
                            </select>
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fec. Fact. Almacenaje</label>
                            <input type="date" className="w-full border rounded p-2 text-sm"
                                value={formData.fecha_facturacion_almacenaje} onChange={e => setFormData({ ...formData, fecha_facturacion_almacenaje: e.target.value })} />
                        </div>

                    </div>
                </div>

                {/* Section 4: Obs & Active */}
                <div className="grid grid-cols-1 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                        <textarea
                            rows={3}
                            className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-blue/20"
                            value={formData.observaciones}
                            onChange={e => setFormData({ ...formData, observaciones: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                className="w-4 h-4 text-brand-blue rounded border-gray-300"
                                checked={formData.activo}
                                onChange={e => setFormData({ ...formData, activo: e.target.checked })}
                            />
                            <span className="text-sm font-medium text-gray-700">Registro Activo</span>
                        </label>
                    </div>
                </div>

                {/* Section 5: Ingresos y Salidas (Only if Edit) */}
                {view === 'edit' && (
                    <div className="pt-8 border-t space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-brand-blue flex items-center gap-2">
                                <TrendingUp size={20} />
                                Control de Movimientos (Ingreso/Salida)
                            </h3>
                        </div>

                        {/* New Movement Form */}
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-3 items-end relative">
                            {newMov.id && (
                                <div className="absolute -top-3 left-4 bg-brand-yellow text-brand-blue-dark text-[10px] font-black px-2 py-0.5 rounded shadow-sm flex items-center gap-1">
                                    EDITANDO MOVIMIENTO
                                    <button onClick={() => setNewMov({
                                        d_orden_id: formData.id,
                                        tipo: 'ingreso',
                                        placa: '',
                                        fecha_hora: new Date().toISOString().slice(0, 16),
                                        conductor: '',
                                        bultos: 0,
                                        peso_bruto: 0,
                                        formulario_ref: '',
                                        estado: 'total'
                                    })} className="hover:text-red-600"><X size={10} /></button>
                                </div>
                            )}
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tipo</label>
                                <select
                                    className="w-full border rounded p-2 text-sm outline-none focus:ring-2 focus:ring-brand-blue/20"
                                    value={newMov.tipo}
                                    onChange={e => setNewMov({ ...newMov, tipo: e.target.value as any })}
                                >
                                    <option value="ingreso">Ingreso</option>
                                    <option value="salida">Salida</option>
                                </select>
                            </div>
                            <div className="lg:col-span-1">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Placa Vehículo</label>
                                <input type="text" className="w-full border rounded p-2 text-sm outline-none" placeholder="ABC-123"
                                    value={newMov.placa} onChange={e => setNewMov({ ...newMov, placa: e.target.value.toUpperCase() })} />
                            </div>
                            <div className="lg:col-span-1">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Fecha y Hora</label>
                                <input type="datetime-local" className="w-full border rounded p-2 text-sm outline-none"
                                    value={newMov.fecha_hora} onChange={e => setNewMov({ ...newMov, fecha_hora: e.target.value })} />
                            </div>
                            <div className="lg:col-span-1 md:col-span-1">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nombre Conductor</label>
                                <input type="text" className="w-full border rounded p-2 text-sm outline-none" placeholder="Nombre completo"
                                    value={newMov.conductor} onChange={e => setNewMov({ ...newMov, conductor: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Bultos</label>
                                <input type="number" className="w-full border rounded p-2 text-sm outline-none"
                                    value={newMov.bultos} onChange={e => setNewMov({ ...newMov, bultos: Number(e.target.value) })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Peso Bruto (Kg)</label>
                                <input type="number" step="0.01" className="w-full border rounded p-2 text-sm outline-none" placeholder="0.00"
                                    value={newMov.peso_bruto} onChange={e => setNewMov({ ...newMov, peso_bruto: Number(e.target.value) })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Alcance</label>
                                <select
                                    className="w-full border rounded p-2 text-sm outline-none focus:ring-2 focus:ring-brand-blue/20"
                                    value={newMov.estado}
                                    onChange={e => setNewMov({ ...newMov, estado: e.target.value as any })}
                                >
                                    <option value="total">Total</option>
                                    <option value="parcial">Parcial</option>
                                </select>
                            </div>
                            {newMov.tipo === 'salida' && (
                                <div className="lg:col-span-1">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Form. Salida</label>
                                    <input type="text" className="w-full border rounded p-2 text-sm outline-none border-brand-blue/30 focus:border-brand-blue bg-blue-50/20" placeholder="Ej. 12345"
                                        value={newMov.formulario_ref || ''} onChange={e => setNewMov({ ...newMov, formulario_ref: e.target.value })} />
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={handleSaveMovimiento}
                                className={`${newMov.id ? 'bg-brand-yellow text-brand-blue-dark' : 'bg-brand-blue text-white'} p-2 rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-1 font-medium text-sm`}
                            >
                                {newMov.id ? <Save size={16} /> : <Plus size={16} />}
                                {newMov.id ? 'Actualizar' : 'Registrar'}
                            </button>
                        </div>

                        {/* Movements History List */}
                        <div className="space-y-3">
                            {movimientos.length > 0 ? (
                                movimientos.map((m, idx) => (
                                    <div key={idx} className={`flex flex-col md:flex-row md:items-center justify-between p-3 rounded-lg border text-sm ${m.tipo === 'ingreso' ? 'bg-green-50/30 border-green-100' : 'bg-orange-50/30 border-orange-100'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleEditMovimiento(m)}
                                                    className="p-1.5 text-gray-400 hover:text-brand-blue transition-colors"
                                                    title="Editar Movimiento"
                                                >
                                                    <Edit size={14} />
                                                </button>
                                                <div className={`p-1.5 rounded-full ${m.tipo === 'ingreso' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                                    {m.tipo === 'ingreso' ? <div className="text-[10px] font-black uppercase px-2">IN</div> : <div className="text-[10px] font-black uppercase px-1">OUT</div>}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-800">Vehículo: {m.placa} | {m.conductor}</div>
                                                <div className="text-xs text-gray-500 font-medium">
                                                    {new Date(m.fecha_hora).toLocaleString('es-CO')} | Alcance: <span className="uppercase font-bold">{m.estado}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6 mt-3 md:mt-0">
                                            <div className="text-right">
                                                <div className="text-[10px] uppercase font-bold text-gray-400">Detalle</div>
                                                <div className={`text-sm font-black ${m.tipo === 'ingreso' ? 'text-green-600' : 'text-orange-600'}`}>
                                                    {m.tipo === 'ingreso' ? '+' : '-'}{m.bultos} Bultos
                                                </div>
                                                <div className="text-[10px] text-gray-500">{m.peso_bruto} Kg</div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteMovimiento(m.id!)}
                                                className="text-gray-300 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6 text-gray-400 italic text-sm border border-dashed rounded-lg bg-gray-50/50">
                                    No hay movimientos registrados para esta D.Orden.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="pt-6 border-t flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => setView('list')}
                        className="px-6 py-3 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                        <X size={20} />
                        Cerrar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-3 bg-brand-blue text-white rounded-lg hover:bg-blue-900 transition-colors flex items-center gap-2 shadow-lg disabled:opacity-70"
                    >
                        {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                        {view === 'create' ? 'Guardar D.O.' : 'Actualizar D.O.'}
                    </button>
                </div>
            </form>
        </div>
    );
};
