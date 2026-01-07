import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, RefreshCw, Globe } from 'lucide-react';

export const DollarTRM: React.FC<{ isCollapsed: boolean }> = ({ isCollapsed }) => {
    const [trm, setTrm] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchTRM = async () => {
        setLoading(true);
        setError(false);

        const sources = [
            {
                url: 'https://trm-colombia.vercel.app/',
                parser: (data: any) => data.value || data.data?.value
            },
            {
                url: 'https://api.exchangerate-api.com/v4/latest/USD',
                parser: (data: any) => data.rates?.COP
            },
            {
                url: 'https://open.er-api.com/v6/latest/USD',
                parser: (data: any) => data.rates?.COP
            }
        ];

        let successValue: number | null = null;

        for (const source of sources) {
            try {
                const response = await fetch(source.url);
                if (!response.ok) continue;

                const data = await response.json();
                const value = source.parser(data);

                if (value && typeof value === 'number') {
                    successValue = value;
                    break;
                }
            } catch (err) {
                console.warn(`Error fetching TRM from ${source.url}:`, err);
            }
        }

        if (successValue) {
            setTrm(successValue);
            setError(false);
        } else {
            setError(true);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchTRM();
        // Refresh every 6 hours
        const interval = setInterval(fetchTRM, 6 * 60 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (isCollapsed) {
        return (
            <div className="flex flex-col items-center justify-center p-2 mb-4 bg-white/5 rounded-lg border border-white/10 group cursor-help transition-all hover:bg-white/10"
                title={`TRM: ${trm ? trm.toLocaleString('es-CO', { style: 'currency', currency: 'COP' }) : 'Cargando...'}`}>
                <DollarSign size={18} className="text-brand-yellow animate-pulse" />
            </div>
        );
    }

    return (
        <div className="mb-6 mx-2 p-3 bg-gradient-to-br from-brand-blue-dark/50 to-brand-blue/30 rounded-xl border border-white/10 shadow-lg group">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="bg-brand-yellow/20 p-1.5 rounded-lg text-brand-yellow shadow-inner">
                        <TrendingUp size={16} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">TRM Hoy</span>
                </div>
                <button
                    onClick={fetchTRM}
                    disabled={loading}
                    className={`text-gray-500 hover:text-white transition-all transform hover:rotate-180 duration-500 ${loading ? 'animate-spin' : ''}`}
                    title="Actualizar"
                >
                    <RefreshCw size={12} />
                </button>
            </div>

            <div className="flex flex-col">
                {loading ? (
                    <div className="h-6 w-24 bg-white/5 animate-pulse rounded"></div>
                ) : error ? (
                    <span className="text-xs text-red-400 font-medium italic">Sincronizando...</span>
                ) : (
                    <div className="flex flex-col">
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-black text-white tracking-tighter shadow-sm">
                                {trm?.toLocaleString('es-CO', {
                                    style: 'currency',
                                    currency: 'COP',
                                    maximumFractionDigits: 2,
                                    minimumFractionDigits: 2
                                })}
                            </span>
                        </div>
                        <a
                            href="https://www.set-icap.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[9px] text-gray-500 font-medium hover:text-brand-yellow transition-colors flex items-center gap-1"
                        >
                            Bolsa de Valores Colombia
                            <Globe size={8} />
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
};
