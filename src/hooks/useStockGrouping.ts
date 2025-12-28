import { useMemo } from 'react';
import type { NormalizedRow, StockStatus } from '../types';

export const useStockGrouping = (data: NormalizedRow[], productDictionary: Record<string, string>) => {
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
    }> = {};

    data.forEach((item) => {
      // CORRECCIÓN CRÍTICA: Usamos '_' porque tus SKUs son tipo "999000_gp00"
      // slice(0, 2) toma las dos primeras partes: "999000" y "gp00" -> "999000_gp00"
      const parts = item.sku.split('_');
      // Si el SKU es corto, usa el original, si es largo, toma la base
      const baseSku = parts.length >= 2 ? parts.slice(0, 2).join('_').toLowerCase() : item.sku.toLowerCase();

      if (!groups[baseSku]) {
        // Buscamos el nombre bonito en el diccionario que viene de Firebase
        const dictionaryName = productDictionary[baseSku];
        
        groups[baseSku] = {
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
        };
      }

      // Sumatoria matemática segura
      groups[baseSku].stock += Number(item.stock) || 0;
      groups[baseSku].transit += Number(item.transit) || 0;
      groups[baseSku].sales2w += Number(item.sales2w) || 0;
      groups[baseSku].ra += Number(item.ra) || 0;
      groups[baseSku].stock_cd += Number(item.stock_cd) || 0;

      // Lógica para determinar Salud de Stock (Analizar cada talla)
      const stockTalla = Number(item.stock || 0);
      if (stockTalla === 0) groups[baseSku].hasZero = true;
      if (stockTalla === 1) groups[baseSku].hasOne = true;
    });

    return Object.values(groups).map(group => {
      let health = { texto: "🟢 COMPLETO", color: "text-green-600 bg-green-50" };
      let status: StockStatus = 'COMPLETO';
      if (group.hasZero) {
        health = { texto: "🔴 INCOMPLETO", color: "text-red-600 bg-red-50" };
        status = 'INCOMPLETO';
      } else if (group.hasOne) {
        health = { texto: "🟡 QUEDA POCO", color: "text-yellow-600 bg-yellow-50" };
        status = 'QUEDA POCO';
      }
      return { ...group, health, status };
    });
  }, [data, productDictionary]);

  return groupedData;
};