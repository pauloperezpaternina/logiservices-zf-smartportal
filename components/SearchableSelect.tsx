
import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, ChevronUp, X } from 'lucide-react';

interface Option {
    id: string;
    label: string;
    [key: string]: any;
}

interface SearchableSelectProps {
    options: Option[];
    value: string | null;
    onChange: (value: string | null) => void;
    placeholder?: string;
    label?: string;
    className?: string;
    disabled?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
    options,
    value,
    onChange,
    placeholder = 'Seleccionar...',
    label,
    className = '',
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredOptions, setFilteredOptions] = useState<Option[]>(options);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setFilteredOptions(
            options.filter(opt =>
                opt.label.toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
    }, [searchTerm, options]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.id === value);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}

            <div
                className={`
          flex items-center justify-between w-full border rounded-lg px-3 py-2 bg-white cursor-pointer transition-all
          ${isOpen ? 'ring-2 ring-brand-blue/20 border-brand-blue' : 'border-gray-300 hover:border-gray-400'}
          ${disabled ? 'bg-gray-100 opacity-60 cursor-not-allowed' : ''}
        `}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <span className={`${!selectedOption ? 'text-gray-400' : 'text-gray-800'} truncate`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <div className="flex items-center gap-2">
                    {selectedOption && !disabled && (
                        <X
                            size={16}
                            className="text-gray-400 hover:text-red-500 cursor-pointer"
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange(null);
                            }}
                        />
                    )}
                    {isOpen ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden flex flex-col">
                    <div className="p-2 border-b border-gray-100 bg-gray-50">
                        <div className="relative">
                            <Search size={16} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20"
                                placeholder="Buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="overflow-y-auto flex-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(option => (
                                <div
                                    key={option.id}
                                    className={`
                    px-3 py-2 text-sm cursor-pointer hover:bg-gray-50
                    ${value === option.id ? 'bg-brand-blue/5 text-brand-blue font-medium' : 'text-gray-700'}
                  `}
                                    onClick={() => {
                                        onChange(option.id);
                                        setIsOpen(false);
                                        setSearchTerm('');
                                    }}
                                >
                                    {option.label}
                                </div>
                            ))
                        ) : (
                            <div className="px-3 py-4 text-center text-sm text-gray-500">
                                No se encontraron resultados
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
