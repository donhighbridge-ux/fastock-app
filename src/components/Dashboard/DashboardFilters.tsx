import React from 'react';

// Definimos estrictamente el "Contrato" de los filtros
export interface FilterState {
  area: string | null;
  categoria: string | null;
  health: string | 'all'; // Tier 2
  sort: string | 'none';  // Tier 3
}

interface DashboardFiltersProps {
  searchTerm: string;
  onSearch: (term: string) => void;
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  areas: string[];
  categories: string[];
}

const DashboardFilters: React.FC<DashboardFiltersProps> = ({ 
  searchTerm,
  onSearch,
  filters,
  onFilterChange,
  areas,
  categories
}) => {
  
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col gap-4">
      
      {/* 🚀 FILA SUPERIOR: Buscador + Tier 1 + Tier 2 */}
      <div className="flex flex-col lg:flex-row gap-4 items-end">
        
        {/* BUSCADOR (Ancho a la izquierda) */}
        <div className="flex-grow w-full">
          <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Buscar Producto</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">🔍</span>
            </div>
            <input
              type="text"
              placeholder="Ej: 880822..."
              value={searchTerm}
              onChange={(e) => onSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow"
            />
          </div>
        </div>

        {/* TIER 1: ÁREA */}
        <div className="w-full lg:w-48 shrink-0">
          <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Área</label>
          <select
            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white cursor-pointer hover:border-gray-400 transition-colors"
            value={filters.area || ''}
            onChange={(e) => onFilterChange({ 
              ...filters, // 🛡️ Persistencia: Mantenemos el resto intacto
              area: e.target.value || null, 
              categoria: null // Solo reseteamos la categoría hija
            })}
          >
            <option value="">Todas las Áreas</option>
            {areas.map((area) => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
        </div>

        {/* TIER 1: CATEGORÍA */}
        <div className="w-full lg:w-48 shrink-0">
          <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Categoría</label>
          <select
            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
            value={filters.categoria || ''}
            onChange={(e) => onFilterChange({ ...filters, categoria: e.target.value || null })}
            disabled={!filters.area}
          >
            <option value="">Todas las Categorías</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* TIER 2: DISPONIBILIDAD (Ex-StockHealth) */}
        <div className="w-full lg:w-56 shrink-0">
          <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Disponibilidad</label>
          <select
            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white cursor-pointer hover:border-gray-400 transition-colors"
            value={filters.health}
            onChange={(e) => onFilterChange({ ...filters, health: e.target.value })}
          >
            <option value="all">Cualquier Estado</option>
            <option value="incompleto">🔴 Incompleto (Quiebre)</option>
            <option value="poco">🟡 Queda Poco (1 un.)</option>
            <option value="completo">🟢 Completo (2+ un.)</option>
          </select>
        </div>
      </div>

      {/* 🚀 FILA INFERIOR: Tier 3 (Ordenamiento) solitario a la izquierda */}
      <div className="flex flex-col lg:flex-row gap-4 items-end pt-2 border-t border-gray-100">
        <div className="w-full lg:w-64">
          <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider flex items-center gap-2">
            <span>⚡ Ordenar Por</span>
          </label>
          <select
            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-blue-50/30 font-medium cursor-pointer hover:border-blue-400 transition-colors"
            value={filters.sort}
            onChange={(e) => onFilterChange({ ...filters, sort: e.target.value })}
          >
            <option value="none">Por Defecto (Alfabético)</option>
            <optgroup label="Ventas (2 Semanas)">
              <option value="sales_desc">🔥 Mayor a Menor Venta</option>
              <option value="sales_asc">🧊 Menor a Mayor Venta</option>
            </optgroup>
            <optgroup label="Volumen de Stock">
              <option value="stock_desc">📦 Mayor a Menor Stock</option>
              <option value="stock_asc">📉 Menor a Mayor Stock</option>
            </optgroup>
          </select>
        </div>
      </div>

    </div>
  );
};

export default DashboardFilters;
