import { useMemo } from 'react';
import type { NormalizedRow, StockStatus } from '../types';
import { getCleanSize } from '../utils/stockUtils';

export const useStockGrouping = (data: NormalizedRow[], productDictionary: Record<string, string>, sizeMap: Record<string, string>) => {
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
      outSizes: string[];
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
          comingSizes: [],
          requestSizes: [],
          outSizes: [],
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
      const transitTalla = Number(item.transit || 0);
      const cdTalla = Number(item.stock_cd || 0);

      // Legacy Logic (Mantenemos esto para que el Modal siga funcionando igual)
      if (stockTalla === 0) groups[baseSku].hasZero = true;
      if (stockTalla === 1) groups[baseSku].hasOne = true;

      // Smart Logic (Fase de Inteligencia)
      if (stockTalla <= 1) {
        const sizeName = getCleanSize(item.sku, sizeMap);
        
        if (transitTalla > 0) {
          groups[baseSku].comingSizes.push(sizeName);
        } else if (cdTalla > 0) {
          groups[baseSku].requestSizes.push(sizeName);
        } else {
          groups[baseSku].outSizes.push(sizeName);
        }
      }
    });

    return Object.values(groups).map(group => {
      // 1. Estado Legacy para el Modal (No tocamos tipos ni lógica interna del modal)
      let status: StockStatus = 'COMPLETO';
      if (group.hasZero) {
        status = 'INCOMPLETO';
      } else if (group.hasOne) {
        status = 'QUEDA POCO';
      }

      // 2. Estado Inteligente para la Tabla (Prioridad: Tránsito > CD > Agotado)
      let health = { texto: "🟢 OK", color: "text-green-600 bg-green-50 border border-green-200" };
      
      const hasMissing = group.comingSizes.length > 0 || group.requestSizes.length > 0 || group.outSizes.length > 0;

      if (hasMissing) {
        const msgs: string[] = [];
        if (group.comingSizes.length > 0) msgs.push(`Viene: ${group.comingSizes.join(', ')}`);
        if (group.requestSizes.length > 0) msgs.push(`Pide: ${group.requestSizes.join(', ')}`);
        if (group.outSizes.length > 0) {
          msgs.push(msgs.length === 0 ? "Sin Stock Global" : `Agotado: ${group.outSizes.join(', ')}`);
        }
        
        const finalText = msgs.join(' | ');

        if (group.comingSizes.length > 0) health = { texto: "🚚 " + finalText, color: "text-orange-700 bg-orange-50 border border-orange-200" };
        else if (group.requestSizes.length > 0) health = { texto: "🏭 " + finalText, color: "text-yellow-700 bg-yellow-50 border border-yellow-200" };
        else health = { texto: "🔴 " + finalText, color: "text-red-700 bg-red-50 border border-red-200" };
      }

      return { ...group, health, status };
    });
  }, [data, productDictionary, sizeMap]);

  return groupedData;
};