import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Loader2, Calendar, Filter, FileText } from 'lucide-react';
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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

export const Dashboard: React.FC<Props> = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ChartData[]>([]);

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

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[400px]">
        <h3 className="text-lg font-bold text-gray-800 mb-6 text-center">Distribución de Órdenes por Cliente</h3>

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
    </div>
  );
};