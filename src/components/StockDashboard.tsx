import React, { useMemo } from 'react';
import { useStockGrouping } from '../hooks/useStockGrouping';
import StockTable from './StockTable';
import type { NormalizedRow } from '../types';

interface StockDashboardProps {
  data: NormalizedRow[];
  rawNationalData: NormalizedRow[];
  productDictionary: Record<string, string>;
  isMultiStore: boolean;
  searchTerm: string;
  filters: { health: string; sort: string; size: string | 'all' };
  sizeMap: Record<string, string>; // Se necesita pasar a la tabla para el Modal
  currentStoreName?: string;
}

export const StockDashboard: React.FC<StockDashboardProps> = ({ 
  data,
  rawNationalData, 
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

// ------------------------------------------------------------------
    // 🟢 NUEVO TIER 4: Intercepción por Referencia Cruzada (Tallas)
    // Buscamos en la data cruda para no perder las tallas del Modal
    // ------------------------------------------------------------------
    if (filters?.size && filters.size !== 'all') {
      const validSkus = new Set<string>();
      
      // 🛠️ HERRAMIENTA 1: El Normalizador (Idéntico al de App.tsx)
      const normalizeSize = (rawSize: string, area: string) => {
        if (!rawSize) return rawSize;
        const upperArea = area?.toUpperCase() || '';
        if (upperArea === 'MENS' || upperArea === 'WOMENS') {
          return rawSize.split('/')[0].trim(); // Corta en el '/' y quita espacios
        }
        return rawSize;
      };

      data.forEach(row => {
        if (row.sku) {
          const parts = row.sku.split('_');
          const sizeCode = parts[parts.length - 1]; // Extraemos la talla técnica
          let friendlySize = sizeMap[sizeCode] || sizeCode; // Traducimos al aire
          
          // 🚀 APLICAMOS LA NORMALIZACIÓN ANTES DE COMPARAR
          friendlySize = normalizeSize(friendlySize, row.area);
          
          // Si el producto coincide con la talla que busca el cliente y tiene stock real:
          if (friendlySize === filters.size && (Number(row.stock) || 0) > 0) {
            // Reconstruimos la llave de su modelo base y lo metemos a la Lista VIP
            const baseSku = parts.length >= 2 ? parts.slice(0, 2).join('_').toLowerCase() : row.sku.toLowerCase();
            validSkus.add(baseSku);
          }
        }
      });

      // Purgamos la tabla: Solo sobreviven los modelos que están en la Lista VIP
      result = result.filter(item => validSkus.has(item.baseSku));
    }

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
  }, [groupedData, filters.health, filters.sort, filters.size, sizeMap, data]);

  // 3. RENDERIZAMOS LA TABLA (Pasamos 'products' procesados y 'rawData' para los modales)
  return (
    <StockTable 
      products={processedProducts} 
      rawData={data} 
      rawNationalData={rawNationalData}
      isMultiStore={isMultiStore}
      sizeMap={sizeMap}
      currentStoreName={currentStoreName}
    />
  );
};
