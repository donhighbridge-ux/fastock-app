import React, { useMemo } from 'react';
import type { NormalizedRow } from '../types';

interface DashboardFiltersProps {
  data: NormalizedRow[];
  onFilter: (filters: {
    marca: string | null;
    tienda: string | null;
    area: string | null;
    categoria: string | null;
  }) => void;
  onSearch: (term: string) => void;
  selectedFilters: {
    marca: string | null;
    tienda: string | null;
    area: string | null;
    categoria: string | null;
  };
}

const DashboardFilters: React.FC<DashboardFiltersProps> = ({ data, onFilter, onSearch, selectedFilters }) => {
  const { marca, tienda, area, categoria } = selectedFilters;

  // 1. Extract unique values for each filter using useMemo for optimization
  const marcas = useMemo(() => {
    const uniqueMarcas = [...new Set(data.map(item => item.marca))];
    return uniqueMarcas.filter(m => m && m.trim() !== "").sort();
  }, [data]);

  const tiendas = useMemo(() => {
    const sourceData = marca ? data.filter(d => d.marca === marca) : data;
    const uniqueTiendas = [...new Set(sourceData.map(item => item.tiendaNombre))];
    return uniqueTiendas.filter(t => t && t.trim() !== "").sort();
  }, [data, marca]);

  const areas = useMemo(() => {
    let sourceData = marca ? data.filter(d => d.marca === marca) : data;
    if (tienda) sourceData = sourceData.filter(d => d.tiendaNombre === tienda);
    const uniqueAreas = [...new Set(sourceData.map(item => item.area))];
    return uniqueAreas.filter(a => a && a.trim() !== "").sort();
  }, [data, marca, tienda]);

  const categorias = useMemo(() => {
    let sourceData = marca ? data.filter(d => d.marca === marca) : data;
    if (tienda) sourceData = sourceData.filter(d => d.tiendaNombre === tienda);
    if (area) sourceData = sourceData.filter(d => d.area === area);
    const uniqueCategorias = [...new Set(sourceData.map(item => item.categoria))];
    return uniqueCategorias.filter(c => c && c.trim() !== "").sort();
  }, [data, marca, tienda, area]);

  // 2. Handle filter changes
  const handleMarcaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMarca = e.target.value === '' ? null : e.target.value;
    onFilter({ marca: newMarca, tienda: null, area: null, categoria: null });
  };

  const handleTiendaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTienda = e.target.value === '' ? null : e.target.value;
    onFilter({ marca, tienda: newTienda, area: null, categoria: null });
  };

  const handleAreaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newArea = e.target.value === '' ? null : e.target.value;
    onFilter({ marca, tienda, area: newArea, categoria: null });
  };

  const handleCategoriaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategoria = e.target.value === '' ? null : e.target.value;
    onFilter({ marca, tienda, area, categoria: newCategoria });
  };

  return (
    <div className="flex flex-row items-end gap-6 bg-white p-5 rounded-lg shadow-sm border border-gray-200 w-full">
      {/* Marca Filter */}
      <div className="flex flex-col items-center justify-center">
        <label htmlFor="marca" className="text-[20px] font-bold text-gray-700 mb-2">Marca</label>
        <select
          id="marca"
          className="w-40 text-center border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 border"
          value={marca || ''}
          onChange={handleMarcaChange}
        >
          <option value="">Todas</option>
          {marcas.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* Tienda Filter */}
      <div className="flex flex-col items-center justify-center">
        <label htmlFor="tienda" className="text-[20px] font-bold text-gray-700 mb-2">Tienda</label>
        <select
          id="tienda"
          className="w-40 text-center border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 border"
          value={tienda || ''}
          onChange={handleTiendaChange}
        >
          <option value="">Todas</option>
          {tiendas.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Área Filter */}
      <div className="flex flex-col items-center justify-center">
        <label htmlFor="area" className="text-[20px] font-bold text-gray-700 mb-2">Área</label>
        <select
          id="area"
          className="w-40 text-center border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 border"
          value={area || ''}
          onChange={handleAreaChange}
        >
          <option value="">Todas</option>
          {areas.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {/* Categoría Filter */}
      <div className="flex flex-col items-center justify-center">
        <label htmlFor="categoria" className="text-[20px] font-bold text-gray-700 mb-2">Categoría</label>
        <select
          id="categoria"
          className="w-40 text-center border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2 border"
          value={categoria || ''}
          onChange={handleCategoriaChange}
        >
          <option value="">Todas</option>
          {categorias.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Buscador */}
      <div className="ml-auto flex flex-col items-center justify-center">
        <label htmlFor="search" className="text-sm font-bold text-gray-700 mb-2">Buscar SKU</label>
        <input
          type="text"
          id="search"
          className="w-64 pl-3 pr-3 py-2 text-center border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm border"
          placeholder="Buscar..."
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
    </div>
  );
};

export default DashboardFilters;