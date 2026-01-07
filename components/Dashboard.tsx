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
      {/* Date Filters Header */}
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
        {/* Main Chart Column (2/3) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[450px] flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 mb-8 flex items-center gap-2">
            <TrendingUp size={20} className="text-brand-blue" />
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
        <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <div className="p-5 flex items-center justify-between border-b border-gray-50">
            <h3 className="text-lg font-black text-gray-800 flex items-center gap-2 tracking-tight">
              <AlertTriangle size={24} className="text-orange-500" />
              Alertas de Almacenaje
            </h3>
            <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-[10px] font-black">
              {storageAlerts.length}
            </span>
          </div>

          <div className="flex-1 p-4 overflow-y-auto max-h-[600px] space-y-4 bg-gray-50/30">
            {loading ? (
              <div className="flex flex-1 items-center justify-center py-20">
                <Loader2 className="animate-spin text-orange-400" size={32} />
              </div>
            ) : storageAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-gray-300 gap-2 py-12">
                <Clock size={40} />
                <p className="text-sm font-medium">No hay alertas pendientes</p>
              </div>
            ) : (
              storageAlerts.map(alert => (
                <div key={alert.id} className="bg-white rounded-2xl border border-orange-100 shadow-sm p-5 hover:shadow-md transition-all relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-400 transform -translate-x-full group-hover:translate-x-0 transition-transform"></div>

                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <span className="text-base font-black text-brand-blue block leading-none">{alert.do_code}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full border border-orange-100 shadow-sm">
                      <Clock size={12} className="shrink-0" />
                      <span className="text-[11px] font-black whitespace-nowrap">Faltan {alert.days_left} días</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 mb-4">
                    <Package size={14} className="text-gray-400 mt-0.5 shrink-0" />
                    <p className="text-xs font-black text-gray-600 uppercase leading-[1.2] line-clamp-2">
                      {alert.client_name}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Fecha Ingreso</p>
                      <p className="text-sm font-bold text-gray-700">{alert.arrival_date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Días en Bodega</p>
                      <p className="text-sm font-black text-orange-600 italic">{alert.days_passed} días</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 bg-gray-50 border-t border-gray-100 rounded-b-xl">
            <div className="flex items-center gap-3 text-[10px] text-gray-500 font-medium">
              <div className="w-2 h-2 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.5)] flex-shrink-0 animate-pulse"></div>
              <p className="leading-tight">Considera D.O. activos sin salida que cumplen un mes (30 días) en los próximos 10 días.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};