import React from 'react';

interface DashboardFiltersProps {
  data: any[];
  onFilter: (filters: any) => void;
  onSearch: (term: string) => void;
  selectedFilters: {
    marca: string | null;
    tienda: string | null;
    area: string | null;
    categoria: string | null;
  };
  areas: string[];
  categories: string[];
}

const DashboardFilters: React.FC<DashboardFiltersProps> = ({ 
  onFilter,
  onSearch,
  selectedFilters,
  areas,
  categories
}) => {
  console.log('🎨 [Filters] DashboardFilters renderizado');
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
      <div className="flex flex-col md:flex-row gap-4 items-end">
        
        {/* BUSCADOR DE SKU (Principal) */}
        <div className="flex-1 w-full">
          <label className="block text-xs font-medium text-gray-500 mb-1">Buscar SKU o Producto</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Ej: 880822..."
              onChange={(e) => onSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onSearch(e.currentTarget.value);
                  e.currentTarget.blur(); // Cierra el teclado en móviles
                }
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
          </div>
        </div>

        {/* FILTRO 1: ÁREA */}
        <div className="w-full md:w-48">
          <label className="block text-xs font-medium text-gray-500 mb-1">Filtrar por Área</label>
          <select
            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white cursor-pointer hover:border-gray-400 transition-colors"
            value={selectedFilters.area || ''}
            onChange={(e) => onFilter({ area: e.target.value || null, categoria: null })}
          >
            <option value="">Todas las Áreas</option>
            {areas.map((area) => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
        </div>

        {/* FILTRO 2: CATEGORÍA */}
        <div className="w-full md:w-48">
          <label className="block text-xs font-medium text-gray-500 mb-1">Filtrar por Categoría</label>
          <select
            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white cursor-pointer hover:border-gray-400 transition-colors"
            value={selectedFilters.categoria || ''}
            onChange={(e) => onFilter({ categoria: e.target.value || null })}
            disabled={!selectedFilters.area}
          >
            <option value="">Todas las Categorías</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

      </div>
    </div>
  );
};

export default DashboardFilters;