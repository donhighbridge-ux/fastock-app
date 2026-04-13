// src/hooks/useStoreRadar.ts
import type { NormalizedRow } from '../types';
import { getBestRatio, isCurrentOrBasicSeason } from '../utils/hunterRules';

export const useStoreRadar = () => {
  const scanStore = (
    data: NormalizedRow[],
    currentStore: string,
    productDictionary: Record<string, string>,
    currentSeason: string,
    carryoverSeason: string,
    curveDictionary: Record<string, { mode1: number; mode2: number | null }>
  ) => {
    const myStoreData = data.filter(row => row.tiendaNombre === currentStore);
    const categoryStats = new Map<string, { totalModels: number, healthyModels: number, hitList: string[] }>();
    const myStoreSkus = new Set<string>();

    const myStoreModels = new Map<string, { 
      area: string; category: string; desc: string; season: string;
      totalSizes: Set<string>; raSizes: Set<string>; storeSizes: Set<string>; 
      transitSizes: Set<string>; cdSizes: Set<string>; sales2wSizes: Set<string>;
      totalStoreStock: number; totalTransit: number;
    }>();

    myStoreData.forEach(row => {
      const parts = row.sku.split('_');
      const baseSku = parts.length >= 2 ? parts.slice(0, 2).join('_') : row.sku;
      const size = parts.length > 2 ? parts.slice(2).join('_') : 'Única';
      const cat = row.categoria?.trim().toUpperCase() || 'SIN CATEGORÍA';
      const area = row.area?.trim().toUpperCase() || 'SIN_AREA';
      const season = row.temporada?.trim().toUpperCase() || 'SIN TEMPORADA';

      const ra = Number(row.ra) || 0;
      const stock = Number(row.stock) || 0;
      const transit = Number(row.transit) || 0;
      const stockCd = Number(row.stock_cd) || 0;
      const sales2w = Number(row.sales2w) || 0;

      // 🟢 CORTAFUEGOS DE RECOMENDADOS: Registro temprano para evitar que te recomienden lo que ya tienes.
      if (ra >= 1 || stock > 0 || transit > 0) {
        myStoreSkus.add(baseSku);
      }

      if (!myStoreModels.has(baseSku)) {
        myStoreModels.set(baseSku, { 
          area, category: cat, desc: productDictionary[baseSku.toLowerCase()] || row.description || '', season,
          totalSizes: new Set(), raSizes: new Set(), storeSizes: new Set(), 
          transitSizes: new Set(), cdSizes: new Set(), sales2wSizes: new Set(),
          totalStoreStock: 0, totalTransit: 0 
        });
      }
      
      const model = myStoreModels.get(baseSku)!;
      model.totalSizes.add(size);
      
      if (ra >= 1) model.raSizes.add(size);
      if (stock >= 1) model.storeSizes.add(size);
      if (transit >= 1) model.transitSizes.add(size);
      if (stockCd >= 1) model.cdSizes.add(size);
      if (sales2w >= 1) model.sales2wSizes.add(size);

      model.totalStoreStock += stock;
      model.totalTransit += transit;
    });

    myStoreModels.forEach((stats, baseSku) => {
      const totalBlockSizes = stats.totalSizes.size;
      if (totalBlockSizes === 0) return;

      const dictKey = `${stats.area}_${stats.category}`;
      const rules = curveDictionary[dictKey];
      const expectedSizes = rules && rules.mode1 > 0 ? rules.mode1 : totalBlockSizes;

      const raRatio = stats.raSizes.size / totalBlockSizes; 
      const bestStoreRatio = getBestRatio(stats.storeSizes.size, expectedSizes, rules?.mode2);
      const bestTransitRatio = getBestRatio(stats.transitSizes.size, expectedSizes, rules?.mode2);
      const bestCdRatio = getBestRatio(stats.cdSizes.size, expectedSizes, rules?.mode2);
      const sales2wRatio = stats.sales2wSizes.size / totalBlockSizes; 

      const isCurrentOrBasic = isCurrentOrBasicSeason(stats.season, currentSeason);
      const isCarryover = stats.season === carryoverSeason;

      // 🛑 REGLA 1: La Asignación Estricta teórica
      if (raRatio < 0.8) return; 

      // 🧱 REGLA 4: La Pared de Liquidación
      if (bestStoreRatio < 0.2 && bestTransitRatio < 0.2 && bestCdRatio < 0.2 && !isCurrentOrBasic) return; 

      // 👻 REGLA 2 y 2.1: Radar de Velocidad para Ceros Absolutos
      if (stats.totalStoreStock === 0 && stats.totalTransit === 0 && bestCdRatio < 0.8) {
        if (!isCurrentOrBasic) return; 
        if (sales2wRatio < 0.8) return; 
      }

      // 🩺 REGLAS 5 y 6: Diagnóstico de Mal Curvado vs Sano
      const coveredSizes = new Set([...stats.storeSizes, ...stats.transitSizes, ...stats.cdSizes]);
      const bestCoveredRatio = getBestRatio(coveredSizes.size, expectedSizes, rules?.mode2);

      const statKey = `${stats.area}_${stats.category}`;
      if (!categoryStats.has(statKey)) categoryStats.set(statKey, { totalModels: 0, healthyModels: 0, hitList: [] });
      const catStat = categoryStats.get(statKey)!;

      if (bestCoveredRatio >= 0.8) {
        catStat.totalModels++; 
        catStat.healthyModels++; 
      } else {
        if (isCurrentOrBasic || isCarryover) {
          catStat.totalModels++; 
          const pct = Math.min(Math.round(bestCoveredRatio * 100), 100);
          catStat.hitList.push(`${baseSku} - ${pct}% (${coveredSizes.size} de ${expectedSizes} tallas esperadas) - ${stats.desc}`);
        }
      }
    });

    categoryStats.forEach(stat => stat.hitList.sort((a, b) => {
      const pctA = parseInt(a.match(/- (\d+)%/)?.[1] || '0');
      const pctB = parseInt(b.match(/- (\d+)%/)?.[1] || '0');
      return pctB - pctA; 
    }));

    return { categoryStats, myStoreSkus };
  };

  return { scanStore };
};
