import { useMemo } from 'react';
import type { NormalizedRow, StockHealth, StockStatus, GroupedProduct } from '../types';

export const useStockGrouping = (
  data: NormalizedRow[], 
  productDictionary: Record<string, string>,
  searchTerm: string = '',
  isMultiStore: boolean = false
): GroupedProduct[] => {
  
  const groupedData = useMemo(() => {
    // 📦 ESTRUCTURA DEL ACUMULADOR (Limpia)
    const groups: Record<string, {
      baseSku: string;
      name: string;
      stock: number;
      transit: number;
      sales2w: number;
      ra: number;
      stock_cd: number;
      isDictionary: boolean;
      originalSku: string;
      
      // 🚦 VARIABLES DE CONTROL (Solo Banderas)
      hasZero: boolean;
      hasOne: boolean;
      
      storeName?: string;
      // 🏷️ Metadata
      area: string;
      categoria: string;
      marca: string;
    }> = {};

    data.forEach((item) => {
      // 1. Identificación
      const parts = item.sku.split('_');
      const baseSku = parts.length >= 2 ? parts.slice(0, 2).join('_').toLowerCase() : item.sku.toLowerCase();

      let groupKey = baseSku;
      if (searchTerm && isMultiStore) {
          groupKey = `${baseSku}_${item.tiendaNombre}`;
      }

      // 2. Inicialización
      if (!groups[groupKey]) {
        groups[groupKey] = {
          baseSku: baseSku,
          name: productDictionary[baseSku] || item.description,
          stock: 0,
          transit: 0,
          sales2w: 0,
          ra: 0,
          stock_cd: Number(item.stock_cd) || 0,
          isDictionary: !!productDictionary[baseSku],
          originalSku: item.sku,
          hasZero: false, 
          hasOne: false,
          storeName: isMultiStore ? item.tiendaNombre : undefined,
          area: item.area || 'General',
          categoria: item.categoria || 'General',
          marca: item.marca || 'General'
        };
      }

      // 3. Sanitización
      const safeStock = item.stock === 'N/A' ? 0 : Number(item.stock) || 0;
      const safeTransit = item.transit === 'N/A' ? 0 : Number(item.transit) || 0;
      const safeSales = item.sales2w === 'N/A' ? 0 : Number(item.sales2w) || 0;
      const safeRa = item.ra === 'N/A' ? 0 : Number(item.ra) || 0;

      const group = groups[groupKey];

      // 4. Agregación
      group.stock += safeStock;
      group.transit += safeTransit;
      group.sales2w += safeSales;
      group.ra += safeRa;

      // 5. Diagnóstico Rápido (Solo Banderas)
      if (safeStock === 0) {
        group.hasZero = true; 
      } else if (safeStock === 1) {
        group.hasOne = true;
      }
    });

    // 6. Transformación Final
    let result = Object.values(groups).map(group => {
      let status: StockStatus = 'COMPLETO'; 
      let emoji = '🟢';

      // Jerarquía de Estado
      if (group.hasZero) {
        status = 'INCOMPLETO';
        emoji = '🔴';
      } else if (group.hasOne) {
        status = 'QUEDA POCO';
        emoji = '🟡';
      }

      // Objeto Health Ligero
      const health: StockHealth = {
        status,
        emoji
        // Sin 'details'
      };

      return { ...group, health };
    });

    // Filtro Opcional Multi-tienda
    if (searchTerm && isMultiStore) {
        result = result.filter((group) => group.stock > 0 || group.transit > 0);
    }

    return result as GroupedProduct[];
  }, [data, productDictionary, searchTerm, isMultiStore]);

  return groupedData;
};
