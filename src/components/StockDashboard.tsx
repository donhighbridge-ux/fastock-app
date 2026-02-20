import React, { useMemo } from 'react';
import { useStockGrouping } from '../hooks/useStockGrouping';
import StockTable from './StockTable';
import type { NormalizedRow } from '../types';

interface StockDashboardProps {
  data: NormalizedRow[];
  productDictionary: Record<string, string>;
  isMultiStore: boolean;
  searchTerm: string;
  filters: { health: string; sort: string };
  sizeMap: Record<string, string>; // Se necesita pasar a la tabla para el Modal
  currentStoreName?: string;
}

export const StockDashboard: React.FC<StockDashboardProps> = ({ 
  data, 
  productDictionary,
  isMultiStore, 
  searchTerm,
  filters,
  sizeMap,
  currentStoreName
}) => {
  
  // 1. EL GUARDIA: Transformamos la data cruda en productos agrupados
  const groupedData = useStockGrouping(data, productDictionary, searchTerm, isMultiStore);

  // 2. EL FILTRO: Aplicamos la lógica de semáforo aquí (antes estaba en la tabla)
  const processedProducts = useMemo(() => {
    let result = groupedData;

      // Filtro de Salud (Semáforo Nuevo)
      if (filters?.health && filters.health !== 'all') {
        const h = filters.health.toLowerCase();
        result = result.filter((item) => {
        // Mapeamos el valor del select a los status del item
        if (h === 'incompleto' && item.health.status !== 'INCOMPLETO') return false;
        if (h === 'poco' && item.health.status !== 'QUEDA POCO') return false;
        if (h === 'completo' && item.health.status !== 'COMPLETO') return false; // Ajusta si usas 'ok' o 'completo'
        return true;
      });
    }
      // Tier 3: Ordenamiento
      if (filters.sort && filters.sort !== 'none') {
      // Usamos [...result] para crear una copia y no mutar el array original (Regla de React)
      result = [...result].sort((a, b) => {
        switch (filters.sort) {
          case 'sales_desc': return b.sales2w - a.sales2w; // Venta Mayor a Menor
          case 'sales_asc': return a.sales2w - b.sales2w;  // Venta Menor a Mayor
          case 'stock_desc': return b.stock - a.stock;     // Stock Mayor a Menor
          case 'stock_asc': return a.stock - b.stock;      // Stock Menor a Mayor
        default: return 0;
      } 
    });      
  }
 
    return result;  
  }, [groupedData, filters.health, filters.sort]);

  // 3. RENDERIZAMOS LA TABLA (Pasamos 'products' procesados y 'rawData' para los modales)
  return (
    <StockTable 
      products={processedProducts} 
      rawData={data} 
      isMultiStore={isMultiStore}
      sizeMap={sizeMap}
      currentStoreName={currentStoreName}
    />
  );
};
