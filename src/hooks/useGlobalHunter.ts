// src/hooks/useGlobalHunter.ts
import type { NormalizedRow } from '../types';
import { isCurrentOrBasicSeason, } from '../utils/hunterRules'; // 🟢 Inyección: getBestRatio

export type OpportunityCandidate = { baseSku: string, category: string, area: string, desc: string, totalSizes: Set<string>, cdSizesAvailable: Set<string>, totalSales: number, totalCdVolume: number };

export const useGlobalHunter = () => {
  const huntGlobal = (
    data: NormalizedRow[],
    currentStore: string,
    myStoreSkus: Set<string>,
    productDictionary: Record<string, string>,
    currentSeason: string,
    carryoverSeason: string,
    curveDictionary: Record<string, { mode1: number; mode2: number | null }> // 🟢 Inyección: El Diccionario
  ) => {

    const otherStoresData = data.filter(row => row.tiendaNombre !== currentStore);
    const globalModels = new Map<string, { category: string, area: string, desc: string, totalSizes: Set<string>, cdSizesAvailable: Set<string>, totalSales: number, totalCdVolume: number, season: string }>();

    otherStoresData.forEach(row => {
      const parts = row.sku.split('_');
      const baseSku = parts.length >= 2 ? parts.slice(0, 2).join('_') : row.sku;
      const size = parts.length > 2 ? parts.slice(2).join('_') : 'Única';
      
      // Filtro 1: Si ya lo tenemos asignado, se ignora.
      if (myStoreSkus.has(baseSku)) return;

      if (!globalModels.has(baseSku)) {
        globalModels.set(baseSku, {
          category: row.categoria?.trim().toUpperCase() || 'SIN CATEGORÍA',
          area: row.area?.trim().toUpperCase() || 'SIN_AREA',
          desc: productDictionary[baseSku.toLowerCase()] || row.description || '',
          totalSizes: new Set(), cdSizesAvailable: new Set(), totalSales: 0, totalCdVolume: 0, season: row.temporada?.trim().toUpperCase() || 'SIN TEMPORADA'
        });
      }
      
      const model = globalModels.get(baseSku)!;
      model.totalSizes.add(size);
      
      const salesCol = Number(row.sales2w) || 0;
      model.totalSales += salesCol;

      const cdStock = Number(row.stock_cd) || 0;
      if (cdStock >= 2) {
        model.cdSizesAvailable.add(size);
        model.totalCdVolume += cdStock;
      }
    });

    const oppsByCategory = new Map<string, OpportunityCandidate[]>();

    globalModels.forEach((stats, baseSku) => {
      const totalBlockSizes = stats.totalSizes.size;
      if (totalBlockSizes === 0) return;
      
      // 🧠 CONSULTA AL DICCIONARIO: El antídoto contra la curva nacional mutilada
      const dictKey = `${stats.area}_${stats.category}`;
      const rules = curveDictionary[dictKey];
      
      // Exigimos como base la Moda 1 (lo que debería ser). Si el diccionario está vacío para esta categoría, confiamos en lo orgánico.
      const expectedSizes = rules && rules.mode1 > 0 ? rules.mode1 : totalBlockSizes;

      // 📊 CÁLCULO ESTRICTO: Comparamos el CD real contra el diccionario teórico (aplicando doble curva si existe)
      // 🧠 DISCRIMINACIÓN DE ADN: ¿Es este un producto de curva corta o larga?
      let targetExpected = expectedSizes; // Por defecto es Moda 1 o el bloque total
      
      if (rules?.mode2 && rules.mode2 > 0) {
        // Si el total de tallas que existen para este SKU en el país es menor o igual 
        // a la Moda 2 (curva corta), lo evaluamos contra la Moda 2.
        // Si es mayor, lo obligamos a medirse contra la Moda 1 para evitar que "se disfrace".
        if (totalBlockSizes <= rules.mode2) {
          targetExpected = rules.mode2;
        } else {
          targetExpected = rules.mode1;
        }
      }

      const cdHealthRatio = stats.cdSizesAvailable.size / targetExpected;

      const isValidSeason = isCurrentOrBasicSeason(stats.season, currentSeason) || stats.season === carryoverSeason;

      // 🛡️ Filtro de Hierro Comercial y Separación por Área
      if (cdHealthRatio >= 0.8 && isValidSeason) {
        const statKey = `${stats.area}_${stats.category}`;
        if (!oppsByCategory.has(statKey)) oppsByCategory.set(statKey, []);
        oppsByCategory.get(statKey)!.push({ baseSku, ...stats });
      }
    });

    return { oppsByCategory };
  };

  return { huntGlobal };
};
