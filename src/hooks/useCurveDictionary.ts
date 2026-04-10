import { useMemo } from 'react';
import type { NormalizedRow } from '../types';

export interface CurveRules {
  mode1: number;
  mode2: number | null;
}

export const useCurveDictionary = (data: NormalizedRow[]): Record<string, CurveRules> => {
  return useMemo(() => {
    const dictionary: Record<string, CurveRules> = {};
    if (!data || data.length === 0) return dictionary;

    // 1. RECOLECCIÓN: Agrupar por Área -> Categoría -> Modelo -> Cantidad de Tallas
    const sizeCounts: Record<string, Record<string, Record<string, Set<string>>>> = {};

    data.forEach(row => {
      const area = row.area?.trim().toUpperCase() || 'SIN_AREA';
      const cat = row.categoria?.trim().toUpperCase() || 'SIN_CATEGORIA';
      const parts = row.sku.split('_');
      const baseSku = parts.length >= 2 ? parts.slice(0, 2).join('_') : row.sku;
      const size = parts.length > 2 ? parts.slice(2).join('_') : 'Única';

      if (!sizeCounts[area]) sizeCounts[area] = {};
      if (!sizeCounts[area][cat]) sizeCounts[area][cat] = {};
      if (!sizeCounts[area][cat][baseSku]) sizeCounts[area][cat][baseSku] = new Set();

      // Solo contamos la talla si tiene existencia física o teórica en la empresa
      if ((Number(row.stock) || 0) > 0 || (Number(row.transit) || 0) > 0 || (Number(row.stock_cd) || 0) > 0) {
          sizeCounts[area][cat][baseSku].add(size);
      }
    });

    // 2. MATEMÁTICA ESTADÍSTICA: Calcular Frecuencias (Modas)
    const categoryModes: Record<string, Record<string, { count: number, freq: number }[]>> = {};

    Object.keys(sizeCounts).forEach(area => {
      categoryModes[area] = {};
      Object.keys(sizeCounts[area]).forEach(cat => {
        const freqMap: Record<number, number> = {};
        
        Object.values(sizeCounts[area][cat]).forEach(sizeSet => {
          const count = sizeSet.size;
          if (count > 0) {
            freqMap[count] = (freqMap[count] || 0) + 1;
          }
        });

        // Ordenar de mayor frecuencia (Moda 1) a menor frecuencia
        const sortedFrequencies = Object.entries(freqMap)
          .map(([count, freq]) => ({ count: Number(count), freq }))
          .sort((a, b) => b.freq - a.freq);

        categoryModes[area][cat] = sortedFrequencies;
      });
    });

    // 3. LÓGICA DE NEGOCIO: La Ley de la Doble Curva y el Escudo de Tops
    const BOTTOMS = ['JEANS', 'PANTALONES', 'SHORTS'];

    Object.keys(categoryModes).forEach(area => {
      // 🛡️ El Ancla: Buscar la Moda 1 de POLERAS en esta área específica
      const polerasFreqs = categoryModes[area]['POLERAS'];
      const polerasMode1 = polerasFreqs && polerasFreqs.length > 0 ? polerasFreqs[0].count : 0;

      Object.keys(categoryModes[area]).forEach(cat => {
        const freqs = categoryModes[area][cat];
        if (freqs.length === 0) return;

        const mode1 = freqs[0].count; // El 100% indiscutible
        let mode2: number | null = null;

        // Si es un Bottom y tiene un segundo grupo importante de tallas
        if (BOTTOMS.includes(cat) && freqs.length > 1) {
          const potentialMode2 = freqs[1].count;
          
          // Aplicar el Escudo de Tops: Solo pasa si es mayor o igual a las poleras
          if (polerasMode1 > 0 && potentialMode2 >= polerasMode1) {
            mode2 = potentialMode2;
          }
        }

        dictionary[`${area}_${cat}`] = { mode1, mode2 };
      });
    });

    console.log("📘 Diccionario de Curvas Dinámico Generado:", dictionary);
    return dictionary;
  }, [data]);
};
