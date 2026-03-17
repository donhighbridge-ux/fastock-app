import { useMemo } from 'react';
import type { NormalizedRow } from '../types';

/**
 * MOTOR DE OPTIMIZACIÓN (O(1) Lookup)
 * Recorre la base de datos nacional una sola vez y crea un diccionario
 * de ventas globales para consultas instantáneas.
 */
export const useGlobalSalesMap = (rawNationalData: NormalizedRow[], isMultiStore: boolean) => {
  return useMemo(() => {
    const map: Record<string, number> = {};
    
    // Si no hay datos nacionales o estamos en vista global, ahorramos memoria
    if (isMultiStore || !rawNationalData || rawNationalData.length === 0) return map;

    for (let i = 0; i < rawNationalData.length; i++) {
      const row = rawNationalData[i];
      const sales = Number(row.sales2w) || 0;
      
      if (sales > 0 && row.sku) {
        // 1. Cortamos siempre los dos primeros bloques (ej: "215587_gp10")
        const parts = String(row.sku).split('_');
        const baseSku = parts.length >= 2 ? `${parts[0]}_${parts[1]}` : row.sku;
        
        // 2. Forzamos MAYÚSCULAS ABSOLUTAS para la llave
        const safeKey = String(baseSku).toUpperCase();
        
        map[safeKey] = (map[safeKey] || 0) + sales;
      }
    }
    return map;
  }, [rawNationalData, isMultiStore]);
};
