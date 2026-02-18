import React, { useMemo } from 'react';
import { useStockGrouping } from '../hooks/useStockGrouping';
import StockTable from './StockTable';
import type { NormalizedRow } from '../types';

interface StockDashboardProps {
  data: NormalizedRow[];
  productDictionary: Record<string, string>;
  isMultiStore: boolean;
  searchTerm: string;
  subFilters: { health: string; status: string }; // Los filtros de semáforo
  sizeMap: Record<string, string>; // Se necesita pasar a la tabla para el Modal
  currentStoreName?: string;
}

export const StockDashboard: React.FC<StockDashboardProps> = ({ 
  data, 
  productDictionary,
  isMultiStore, 
  searchTerm,
  subFilters,
  sizeMap,
  currentStoreName
}) => {
  
  // 1. EL GUARDIA: Transformamos la data cruda en productos agrupados
  const groupedData = useStockGrouping(data, productDictionary, searchTerm, isMultiStore);

  // 2. EL FILTRO: Aplicamos la lógica de semáforo aquí (antes estaba en la tabla)
  const filteredProducts = useMemo(() => {
    return groupedData.filter((item) => {
      // Filtro de Salud (Semáforo Nuevo)
      if (subFilters?.health && subFilters.health !== 'all') {
        const h = subFilters.health.toLowerCase();
        // Mapeamos el valor del select a los status del item
        if (h === 'incompleto' && item.health.status !== 'INCOMPLETO') return false;
        if (h === 'poco' && item.health.status !== 'QUEDA POCO') return false;
        if (h === 'completo' && item.health.status !== 'COMPLETO') return false; // Ajusta si usas 'ok' o 'completo'
      }

      // Filtro de Estado de Negocio (Si lo conservas)
      if (subFilters?.status && subFilters.status !== 'all') {
        // Aquí iría tu lógica antigua de status si la sigues usando
        // Por ahora lo dejamos pasante o ajustas según tu necesidad real
      }

      return true;
    });
  }, [groupedData, subFilters]);

  // 3. RENDERIZAMOS LA TABLA (Pasamos 'products' procesados y 'rawData' para los modales)
  return (
    <StockTable 
      products={filteredProducts} 
      rawData={data} 
      isMultiStore={isMultiStore}
      sizeMap={sizeMap}
      currentStoreName={currentStoreName}
    />
  );
};
