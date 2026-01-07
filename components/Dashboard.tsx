import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Loader2, Calendar, Filter, FileText, AlertTriangle, Clock, Package, ChevronRight, TrendingUp } from 'lucide-react';
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
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

export const Dashboard: React.FC<Props> = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ChartData[]>([]);
  const [storageAlerts, setStorageAlerts] = useState<StorageAlert[]>([]);

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

          // User wants alerts for those with less than 10 days to reach 1 month
          // Including those that might have slightly passed it? 
          // Instruction: "menos de 10 dias para cumplir un mes" -> [21-30 days]
          if (daysToMonth >= 0 && daysToMonth <= 10) {
            alerts.push({
              id: order.id,
              do_code: order.do_code,
              client_name: (order as any).cliente?.nombre || '---',
              arrival_date: arrivalDate.toLocaleDateString(),
              days_passed: diffDays,
              days_left: daysToMonth
            });
          }
        }
      });

      setStorageAlerts(alerts.sort((a, b) => a.days_left - b.days_left));

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
      <div className="flex flex-col md:flex-row items-center justify-center gap-8">
        <div className="relative w-64 h-64">
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
        <div className="grid grid-cols-1 gap-2">
          {data.map((slice, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: slice.color }}></div>
              <span className="font-semibold text-gray-700">{slice.name}</span>
              <span className="text-gray-500">({slice.value} - {slice.percent.toFixed(1)}%)</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-gray-700">
          <Filter size={20} className="text-brand-blue" />
          <h2 className="font-bold">Filtros de Fecha</h2>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[400px]">
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-brand-blue" />
            Distribución de Órdenes por Cliente
          </h3>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="animate-spin text-brand-blue" size={40} />
            </div>
          ) : data.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-gray-400 flex-col gap-2">
              <FileText size={40} />
              <p>No hay datos para el rango seleccionado</p>
            </div>
          ) : (
            <SimplePieChart data={data} />
          )}
        </div>

        {/* Alerts Column */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <AlertTriangle size={20} className="text-orange-500" />
              Alertas de Almacenaje
            </h3>
            <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-[10px] font-black">
              {storageAlerts.length}
            </span>
          </div>

          {loading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="animate-spin text-orange-400" size={24} />
            </div>
          ) : storageAlerts.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center text-gray-300 gap-2 py-12">
              <Clock size={40} />
              <p className="text-sm font-medium">No hay alertas pendientes</p>
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto max-h-[500px] pr-1">
              {storageAlerts.map(alert => (
                <div key={alert.id} className="group p-4 bg-orange-50/50 rounded-xl border border-orange-100 hover:bg-orange-50 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-black text-brand-blue">{alert.do_code}</span>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-white px-2 py-0.5 rounded-full border border-orange-100">
                      <Clock size={10} />
                      {alert.days_left === 0 ? '¡Hoy cumple!' : `Faltan ${alert.days_left} días`}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Package size={12} className="text-gray-400" />
                      <p className="text-xs text-gray-600 font-medium truncate">{alert.client_name}</p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-orange-100/50 mt-2">
                      <div className="text-[10px] text-gray-500">
                        <span className="block font-bold text-gray-400 uppercase">Ingreso</span>
                        {alert.arrival_date}
                      </div>
                      <div className="text-[10px] text-right text-gray-500">
                        <span className="block font-bold text-gray-400 uppercase">Días en Bodega</span>
                        <span className="font-black text-orange-600">{alert.days_passed} días</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="mt-4 text-[10px] text-gray-400 italic bg-gray-50 p-2 rounded text-center">
            * Muestra D.O. que cumplen un mes (30 días) en los próximos 10 días.
          </p>
        </div>
      </div>
    </div>
  );
};