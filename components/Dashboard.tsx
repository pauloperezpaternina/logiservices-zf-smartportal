import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Loader2, Calendar, Filter, FileText, AlertTriangle, Clock, Package, ChevronRight, ChevronLeft, TrendingUp } from 'lucide-react';
import { User, Shipment } from '../types';

interface Props {
  user: User;
  shipments: Shipment[];
}

interface ChartData {
  name: string;
  value: number;
  color: string;
  percent: number;
}

interface StorageAlert {
  id: string;
  do_code: string;
  client_name: string;
  arrival_date: string;
  days_passed: number;
  days_left: number;
  months_billable: number; // Cuántos meses completos de almacenaje para facturar
  is_overdue: boolean; // true si ya pasó de 30 días
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

export const Dashboard: React.FC<Props> = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ChartData[]>([]);
  const [storageAlerts, setStorageAlerts] = useState<StorageAlert[]>([]);
  const [alertPage, setAlertPage] = useState(1);
  const ALERTS_PER_PAGE = 5;

  // Date Filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });

  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  useEffect(() => {
    fetchDashboardData();
  }, [startDate, endDate]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data: ordenes, error } = await supabase
        .from('d_ordenes')
        .select('client_id_entidad')
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${endDate}T23:59:59`);

      if (error) throw error;

      const clientIds = Array.from(new Set(ordenes?.map(o => o.client_id_entidad) || [])).filter(Boolean);

      let clientMap: Record<string, string> = {};
      if (clientIds.length > 0) {
        const { data: clients } = await supabase
          .from('entidades')
          .select('id, nombre')
          .in('id', clientIds);
        clients?.forEach(c => {
          clientMap[c.id] = c.nombre;
        });
      }

      const counts: Record<string, number> = {};
      let total = 0;
      ordenes?.forEach(o => {
        const name = clientMap[o.client_id_entidad] || 'Desconocido';
        counts[name] = (counts[name] || 0) + 1;
        total++;
      });

      const chartData: ChartData[] = Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .map(([name, value], index) => ({
          name,
          value,
          color: COLORS[index % COLORS.length],
          percent: total > 0 ? (value / total) * 100 : 0
        }));

      setData(chartData);

      // --- Storage Alerts Logic ---
      const { data: activeOrders } = await supabase
        .from('d_ordenes')
        .select(`
          id, do_code, client_id_entidad,
          cliente:entidades!client_id_entidad(nombre),
          movimientos:d_ordenes_movimientos(*)
        `)
        .eq('activo', true);

      const now = new Date();
      const alerts: StorageAlert[] = [];

      activeOrders?.forEach(order => {
        const movimientos = (order.movimientos as any[]) || [];

        // Skip if there is ANY 'salida' movement
        const hasSalida = movimientos.some(m => m.tipo === 'salida');
        if (hasSalida) return;

        // Arrival date is the first 'ingreso' movement
        const ingresos = movimientos
          ?.filter(m => m.tipo === 'ingreso')
          .sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime());

        if (ingresos && ingresos.length > 0) {
          const arrivalDate = new Date(ingresos[0].fecha_hora);
          const diffMs = now.getTime() - arrivalDate.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

          // Target is 30 days (1 month approx)
          const daysToMonth = 30 - diffDays;

          // Calcular meses completos de almacenaje para facturación
          const monthsBillable = Math.floor(diffDays / 30);

          // NUEVA LÓGICA:
          // 1. D.O. próximas a cumplir 30 días (entre 20-30 días, faltan 0-10 días)
          // 2. D.O. que ya pasaron los 30 días (vencidas) - SIEMPRE se muestran
          const isNearMonth = daysToMonth >= 0 && daysToMonth <= 10; // Entre 20-30 días
          const isOverdue = diffDays >= 30; // Ya pasaron 30 días o más

          if (isNearMonth || isOverdue) {
            alerts.push({
              id: order.id,
              do_code: order.do_code,
              client_name: (order as any).cliente?.nombre || '---',
              arrival_date: arrivalDate.toLocaleDateString(),
              days_passed: diffDays,
              days_left: daysToMonth > 0 ? daysToMonth : 0,
              months_billable: monthsBillable,
              is_overdue: isOverdue
            });
          }
        }
      });

      // Ordenar: primero las vencidas (por más días), luego las próximas (por menos días restantes)
      setStorageAlerts(alerts.sort((a, b) => {
        // Las vencidas primero
        if (a.is_overdue && !b.is_overdue) return -1;
        if (!a.is_overdue && b.is_overdue) return 1;
        // Entre vencidas, las que llevan más días primero
        if (a.is_overdue && b.is_overdue) return b.days_passed - a.days_passed;
        // Entre próximas, las que tienen menos días restantes primero
        return a.days_left - b.days_left;
      }));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Simple SVG Pie Chart Component
  const SimplePieChart = ({ data }: { data: ChartData[] }) => {
    let cumulativePercent = 0;

    const getCoordinatesForPercent = (percent: number) => {
      const x = Math.cos(2 * Math.PI * percent);
      const y = Math.sin(2 * Math.PI * percent);
      return [x, y];
    };

    return (
      <div className="flex flex-col md:flex-row items-center justify-center gap-6">
        <div className="relative w-48 h-48">
          <svg viewBox="-1 -1 2 2" className="transform -rotate-90 w-full h-full">
            {data.map((slice, i) => {
              const start = cumulativePercent; // 0..1
              cumulativePercent += slice.percent / 100;
              const end = cumulativePercent; // 0..1

              // If it's a full circle
              if (slice.percent === 100) {
                return <circle key={i} cx="0" cy="0" r="1" fill={slice.color} />;
              }

              const [startX, startY] = getCoordinatesForPercent(start);
              const [endX, endY] = getCoordinatesForPercent(end);
              const largeArcFlag = slice.percent > 50 ? 1 : 0;

              const pathData = [
                `M 0 0`,
                `L ${startX} ${startY}`,
                `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                `L 0 0`,
              ].join(' ');

              return (
                <path key={i} d={pathData} fill={slice.color} stroke="white" strokeWidth="0.01" />
              );
            })}
            {/* Center hole for Donut effect (optional, looks better) */}
            <circle cx="0" cy="0" r="0.6" fill="white" />
          </svg>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-1 gap-1.5 max-h-[180px] overflow-y-auto">
          {data.map((slice, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px]">
              <div className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: slice.color }}></div>
              <span className="font-semibold text-gray-700 truncate max-w-[100px]">{slice.name}</span>
              <span className="text-gray-500 whitespace-nowrap">({slice.value} - {slice.percent.toFixed(1)}%)</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Date Filters Header */}
      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-gray-700">
          <Filter size={16} className="text-brand-blue" />
          <h2 className="font-bold text-sm">Filtros de Fecha</h2>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Desde:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-blue/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Hasta:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-blue/20"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Chart Column (2/3) */}
        <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow-sm border border-gray-100 min-h-[300px] flex flex-col">
          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-brand-blue" />
            Distribución de Órdenes por Cliente
          </h3>

          {loading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="animate-spin text-brand-blue" size={40} />
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-gray-400 flex-col gap-2">
              <FileText size={48} />
              <p className="text-lg font-medium">No hay datos en el rango seleccionado</p>
            </div>
          ) : (
            <SimplePieChart data={data} />
          )}
        </div>

        {/* Alerts Column (1/3) */}
        <div className="bg-white p-1 rounded-lg shadow-sm border border-gray-100 flex flex-col">
          <div className="p-3 flex items-center justify-between border-b border-gray-50">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <AlertTriangle size={16} className="text-orange-500" />
              Alertas de Almacenaje
            </h3>
            <span className="bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
              {storageAlerts.length}
            </span>
          </div>

          <div className="flex-1 p-3 overflow-y-auto max-h-[400px] space-y-2 bg-gray-50/30">
            {loading ? (
              <div className="flex flex-1 items-center justify-center py-12">
                <Loader2 className="animate-spin text-orange-400" size={24} />
              </div>
            ) : storageAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-gray-300 gap-2 py-8">
                <Clock size={28} />
                <p className="text-xs font-medium">No hay alertas pendientes</p>
              </div>
            ) : (
              storageAlerts
                .slice((alertPage - 1) * ALERTS_PER_PAGE, alertPage * ALERTS_PER_PAGE)
                .map(alert => {
                  // Calcular días para próxima facturación (próximo mes completo)
                  const diasParaFactura = 30 - (alert.days_passed % 30);
                  const mesesCompletos = Math.floor(alert.days_passed / 30);

                  return (
                    <div key={alert.id} className={`bg-white rounded-lg border shadow-sm p-3 hover:shadow-md transition-all relative overflow-hidden group ${mesesCompletos > 0 ? 'border-blue-200' : 'border-orange-100'
                      }`}>
                      <div className={`absolute top-0 left-0 w-1 h-full transform -translate-x-full group-hover:translate-x-0 transition-transform ${mesesCompletos > 0 ? 'bg-blue-500' : 'bg-orange-400'
                        }`}></div>

                      <div className="flex justify-between items-start mb-2">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-brand-blue block leading-none">{alert.do_code}</span>
                          {mesesCompletos > 0 && (
                            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[8px] font-bold">
                              💰 {mesesCompletos} {mesesCompletos === 1 ? 'mes' : 'meses'} a facturar
                            </span>
                          )}
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[9px] font-bold ${diasParaFactura <= 5
                            ? 'bg-red-50 text-red-600 border-red-100'
                            : diasParaFactura <= 10
                              ? 'bg-orange-50 text-orange-600 border-orange-100'
                              : 'bg-green-50 text-green-600 border-green-100'
                          }`}>
                          <Clock size={10} className="shrink-0" />
                          <span className="whitespace-nowrap">
                            {diasParaFactura}d para factura
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 mb-2">
                        <Package size={10} className="text-gray-400 shrink-0" />
                        <p className="text-[10px] font-semibold text-gray-600 uppercase truncate">
                          {alert.client_name}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50 text-[9px]">
                        <div>
                          <p className="font-bold text-gray-400 uppercase">Ingreso</p>
                          <p className="font-semibold text-gray-700">{alert.arrival_date}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-400 uppercase">Almacenaje</p>
                          <p className="font-bold text-blue-600">
                            {alert.days_passed} días
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>

          {/* Pagination Controls */}
          {storageAlerts.length > ALERTS_PER_PAGE && (
            <div className="p-3 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => setAlertPage(p => Math.max(1, p - 1))}
                disabled={alertPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gray-100 hover:bg-gray-200 text-gray-600"
              >
                <ChevronLeft size={14} />
                Anterior
              </button>
              <span className="text-xs font-bold text-gray-500">
                Página {alertPage} de {Math.ceil(storageAlerts.length / ALERTS_PER_PAGE)}
              </span>
              <button
                onClick={() => setAlertPage(p => Math.min(Math.ceil(storageAlerts.length / ALERTS_PER_PAGE), p + 1))}
                disabled={alertPage >= Math.ceil(storageAlerts.length / ALERTS_PER_PAGE)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gray-100 hover:bg-gray-200 text-gray-600"
              >
                Siguiente
                <ChevronRight size={14} />
              </button>
            </div>
          )}

          <div className="p-3 bg-gray-50 border-t border-gray-100 rounded-b-lg">
            <div className="flex items-center gap-2 text-[9px] text-gray-500 font-medium">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0 animate-pulse"></div>
              <p className="leading-tight">D.O. activos sin salida. Contabilidad debe facturar antes de cumplir cada mes de almacenaje.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};