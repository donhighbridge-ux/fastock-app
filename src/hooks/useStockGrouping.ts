import { useMemo } from 'react';
import type { NormalizedRow, StockHealth, StockStatus, GroupedProduct } from '../types'; // <--- Importa GroupedProduct
import { getCleanSize } from '../utils/stockUtils';

// Cambia el tipo de retorno explícitamente a GroupedProduct[]
export const useStockGrouping = (
  data: NormalizedRow[], 
  productDictionary: Record<string, string>, 
  sizeMap: Record<string, string>,
  searchTerm: string = '',
  isMultiStore: boolean = false
): GroupedProduct[] => { // <--- TIPADO ESTRICTO DE SALIDA
  const groupedData = useMemo(() => {
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
      hasZero: boolean;
      hasOne: boolean;
      comingSizes: string[];
      requestSizes: string[];
      deadSizes: string[];
      storeName?: string;
    }> = {};

    data.forEach((item) => {
      // 1. Identificación de Grupo
      const parts = item.sku.split('_');
      const baseSku = parts.length >= 2 ? parts.slice(0, 2).join('_').toLowerCase() : item.sku.toLowerCase();

      let groupKey = baseSku;
      let storeName: string | undefined = undefined;

      if (searchTerm && isMultiStore) {
          groupKey = `${baseSku}_${item.tiendaNombre}`;
          storeName = item.tiendaNombre;
      }

      // 2. Inicialización (Si no existe el grupo)
      if (!groups[groupKey]) {
        const dictionaryName = productDictionary[baseSku];
        groups[groupKey] = {
          baseSku,
          originalSku: item.sku,
          name: dictionaryName || item.description || "Sin Nombre",
          stock: 0,
          transit: 0,
          sales2w: 0,
          ra: 0,
          stock_cd: 0,
          isDictionary: !!dictionaryName,
          hasZero: false,
          hasOne: false,
          comingSizes: [],
          requestSizes: [],
          deadSizes: [],
          storeName,
        };
      }

      // 3. AGREGACIÓN TIPADA (Estilo Palantir)
      // Gracias a types.ts estricto y el parser robusto, confiamos ciegamente en la data.
      // Ya no hay "as any", ni "?? 0", ni conversiones dudosas.
      
      const group = groups[groupKey]; // Referencia local para limpieza visual

      group.stock += item.stock;
      group.transit += item.transit;
      group.stock_cd += item.stock_cd;
      group.sales2w += item.sales2w;
      group.ra += item.ra;

      // 4. Lógica de Negocio (Semáforo)
      if (item.stock <= 1) {
        if (item.stock === 0) group.hasZero = true;
        if (item.stock === 1) group.hasOne = true;

        const sizeName = getCleanSize(item.sku, sizeMap);
        
        // Jerarquía de Decisión
        if (item.transit > 0) {
          group.comingSizes.push(sizeName);
        } else if (item.stock_cd > 0) {
          group.requestSizes.push(sizeName);
        } else {
          group.deadSizes.push(sizeName);
        }
      }
    });

    // 5. Transformación a Array y Estado Final
    let result = Object.values(groups).map(group => {
      let status: StockStatus = 'STOCK OK';
      let emoji = '🟢';

      if (group.comingSizes.length > 0) {
        status = 'EN TRÁNSITO';
        emoji = '🟠';
      } else if (group.requestSizes.length > 0) {
        status = 'PIDE SOLO...';
        emoji = '🟡';
      } else if (group.deadSizes.length > 0) {
        status = 'NADA EN EL CD';
        emoji = '🔴';
      }

      const health: StockHealth = {
        status,
        emoji,
        details: {
          coming: group.comingSizes,
          request: group.requestSizes,
          dead: group.deadSizes
        }
      };

      return { ...group, health };
    });

    // Filtro de limpieza para vista multi-tienda
    if (searchTerm && isMultiStore) {
        result = result.filter((group) => group.stock > 0 || group.transit > 0);
    }

    return result as GroupedProduct[]; // Cast final seguro porque construimos el objeto correctamente
  }, [data, productDictionary, sizeMap, searchTerm, isMultiStore]);

  return groupedData;
};