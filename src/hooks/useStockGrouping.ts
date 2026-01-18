import { useMemo } from 'react';
import type { NormalizedRow, StockHealth, StockStatus } from '../types';
import { getCleanSize } from '../utils/stockUtils';

export const useStockGrouping = (
  data: NormalizedRow[], 
  productDictionary: Record<string, string>, 
  sizeMap: Record<string, string>,
  searchTerm: string = '',
  isMultiStore: boolean = false
) => {
  // 1. EL CEREBRO: Lógica de Agrupación y Suma
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
      originalSku: string; // Guardamos uno de referencia
      hasZero: boolean;
      hasOne: boolean;
      comingSizes: string[];
      requestSizes: string[];
      deadSizes: string[];
      storeName?: string; // Nueva propiedad opcional
    }> = {};

    data.forEach((item) => {
      // CORRECCIÓN CRÍTICA: Usamos '_' porque tus SKUs son tipo "999000_gp00"
      // slice(0, 2) toma las dos primeras partes: "999000" y "gp00" -> "999000_gp00"
      const parts = item.sku.split('_');
      // Si el SKU es corto, usa el original, si es largo, toma la base
      const baseSku = parts.length >= 2 ? parts.slice(0, 2).join('_').toLowerCase() : item.sku.toLowerCase();

      // NUEVA LÓGICA: Desglose por tienda si hay búsqueda y estamos en modo multi-tienda
      let groupKey = baseSku;
      let storeName: string | undefined = undefined;

      if (searchTerm && isMultiStore) {
          groupKey = `${baseSku}_${item.tiendaNombre}`;
          storeName = item.tiendaNombre;
      }

      if (!groups[groupKey]) {
        // Buscamos el nombre bonito en el diccionario que viene de Firebase
        const dictionaryName = productDictionary[baseSku];
        
        groups[groupKey] = {
          baseSku,
          originalSku: item.sku,
          // Prioridad: Diccionario > Description (Inglés) > Descripcion (Español) > Aviso
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
          storeName, // Asignamos el nombre de la tienda si existe
        };
      }

      // Sumatoria matemática segura
      groups[groupKey].stock += Number(item.stock) || 0;
      groups[groupKey].transit += Number(item.transit) || 0;
      groups[groupKey].sales2w += Number(item.sales2w) || 0;
      groups[groupKey].ra += Number(item.ra) || 0;
      groups[groupKey].stock_cd += Number(item.stock_cd) || 0;

      // Lógica para determinar Salud de Stock (Analizar cada talla)
      const stockTalla = Number(item.stock || 0);
      const transitTalla = Number(item.transit || 0);
      const cdTalla = Number(item.stock_cd || 0);

      // Legacy Logic (Mantenemos esto para que el Modal siga funcionando igual)
      if (stockTalla === 0) groups[groupKey].hasZero = true;
      if (stockTalla === 1) groups[groupKey].hasOne = true;

      // Smart Logic (Fase de Inteligencia)
      if (stockTalla <= 1) {
        const sizeName = getCleanSize(item.sku, sizeMap);
        
        if (transitTalla > 0) {
          groups[groupKey].comingSizes.push(sizeName);
        } else if (cdTalla > 0) {
          groups[groupKey].requestSizes.push(sizeName);
        } else {
          groups[groupKey].deadSizes.push(sizeName);
        }
      }
    });

    let result = Object.values(groups).map(group => {
      // 2. Estado Inteligente (Fase 2)
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

    // FILTRO DE LIMPIEZA ("Luz Verde")
    // Si estamos en modo búsqueda desglosada, eliminamos las tiendas sin actividad (stock 0 y tránsito 0)
    if (searchTerm && isMultiStore) {
        result = result.filter((group) => group.stock > 0 || group.transit > 0);
    }

    return result;
  }, [data, productDictionary, sizeMap, searchTerm, isMultiStore]);

  return groupedData;
};