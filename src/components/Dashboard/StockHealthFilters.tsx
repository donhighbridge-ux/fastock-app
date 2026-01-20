import React from 'react';

interface StockHealthFiltersProps {
  filters: {
    health: string;
    status: string;
  };
  onChange: (newFilters: { health: string; status: string }) => void;
}

const StockHealthFilters: React.FC<StockHealthFiltersProps> = ({ filters, onChange }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
      <div className="flex flex-col md:flex-row gap-6 items-end">
        
        {/* FILTRO 1: SALUD DEL STOCK */}
        <div className="w-full md:w-64">
          <label className="block text-xs font-medium text-gray-500 mb-1">Salud del Stock (Semáforo)</label>
          <select
            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white cursor-pointer hover:border-gray-400 transition-colors"
            value={filters.health}
            onChange={(e) => onChange({ ...filters, health: e.target.value })}
          >
            <option value="all">Todas las Saludes</option>
            <option value="incompleto">🔴 Incompleto (Faltan tallas)</option>
            <option value="poco">🟡 Queda poco (1 unidad)</option>
            <option value="ok">🟢 Stock Ok (Suficiente)</option>
          </select>
        </div>

        {/* FILTRO 2: INFORME DE ESTADO */}
        <div className="w-full md:w-64">
          <label className="block text-xs font-medium text-gray-500 mb-1">Informe de Estado (Negocio)</label>
          <select
            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white cursor-pointer hover:border-gray-400 transition-colors"
            value={filters.status}
            onChange={(e) => onChange({ ...filters, status: e.target.value })}
          >
            <option value="all">Todos los Estados</option>
            <option value="NADA EN EL CD">NADA EN EL CD</option>
            <option value="EN TRÁNSITO">EN TRÁNSITO</option>
            <option value="PIDE SOLO...">PIDE SOLO...</option>
            <option value="STOCK OK">STOCK OK</option>
          </select>
        </div>

      </div>
    </div>
  );
};

export default StockHealthFilters;