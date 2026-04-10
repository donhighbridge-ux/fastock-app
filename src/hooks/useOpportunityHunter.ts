import { useState } from 'react';
import { useCart } from '../context/useCart';
import type { NormalizedRow } from '../types';

export const useOpportunityHunter = (
  data: NormalizedRow[], 
  currentStore: string | null, 
  productDictionary: Record<string, string>,
  currentSeason: string
) => {
  const { addToRequest } = useCart();
  const [hunterFeedback, setHunterFeedback] = useState<string | null>(null);

  const huntOpportunities = () => {
    if (!currentStore || currentStore === 'all') {
      setHunterFeedback('⚠️ Selecciona una tienda específica para cazar oportunidades.');
      setTimeout(() => setHunterFeedback(null), 3000);
      return;
    }

    // 🟢 HELPER: Viaje en el tiempo (Excepción A - Carryover)
    const getCarryover = (season: string) => {
      const match = season.match(/^([A-Z]+)(\d{4})$/);
      if (!match) return 'N/A';
      return `${match[1]}${parseInt(match[2]) - 1}`;
    };
    const carryoverSeason = getCarryover(currentSeason);

// ---------------------------------------------------------
    // 🟢 FASE 1: RADIOGRAFÍA DEL MUEBLE ACTUAL (HIT LIST)
    // ---------------------------------------------------------
    const myStoreData = data.filter(row => row.tiendaNombre === currentStore);
    const categoryStats = new Map<string, { totalModels: number, healthyModels: number, hitList: string[] }>();
    const myStoreSkus = new Set<string>();

// 🟢 NUEVO ECOSISTEMA: Sensores para cazar Fantasmas
    const myStoreModels = new Map<string, { 
      category: string, totalSizes: Set<string>, coveredSizes: Set<string>, desc: string,
      totalStoreStock: number, totalTransit: number, cdAvailableSizes: Set<string>, season: string 
    }>();

    myStoreData.forEach(row => {
      const parts = row.sku.split('_');
      const baseSku = parts.length >= 2 ? parts.slice(0, 2).join('_') : row.sku;
      const size = parts.length > 2 ? parts.slice(2).join('_') : 'Única';
      const cat = row.categoria?.trim().toUpperCase() || 'SIN CATEGORÍA';

      if (Number(row.ra) >= 1 || Number(row.stock) > 0) {
        myStoreSkus.add(baseSku);
      }

      if (!myStoreModels.has(baseSku)) {
        myStoreModels.set(baseSku, { 
          category: cat, totalSizes: new Set(), coveredSizes: new Set(), desc: productDictionary[baseSku.toLowerCase()] || row.description || '',
          totalStoreStock: 0, totalTransit: 0, cdAvailableSizes: new Set(), season: row.temporada?.trim().toUpperCase() || 'SIN TEMPORADA'
        });
      }
      
      const model = myStoreModels.get(baseSku)!;
      model.totalSizes.add(size);
      
      const stock = Number(row.stock) || 0;
      const transit = Number(row.transit) || 0;
      const stockCd = Number(row.stock_cd) || 0;

      model.totalStoreStock += stock;
      model.totalTransit += transit;
      if (stockCd >= 1) model.cdAvailableSizes.add(size);

      if (stock > 0 || transit > 0 || stockCd > 0) {
        model.coveredSizes.add(size);
      }
    });

    myStoreModels.forEach((stats, baseSku) => {
      // 👻 EL EXORCISMO: Filtro Anti-Fantasmas
      const cdHealthRatio = stats.cdAvailableSizes.size / stats.totalSizes.size;
      const isGhost = stats.totalStoreStock === 0 && 
                      stats.totalTransit === 0 && 
                      cdHealthRatio < 0.8 && 
                      stats.season !== 'BÁSICO' && 
                      stats.season !== currentSeason;
      
      if (isGhost) return; // Muere en silencio, no entra al reporte.

      if (!categoryStats.has(stats.category)) categoryStats.set(stats.category, { totalModels: 0, healthyModels: 0, hitList: [] });
      const catStat = categoryStats.get(stats.category)!;
      catStat.totalModels++;

      const healthRatio = stats.coveredSizes.size / stats.totalSizes.size;
      if (healthRatio >= 0.8) {
        catStat.healthyModels++;
      } else {
        const pct = Math.round(healthRatio * 100);
        catStat.hitList.push(`${baseSku} - ${pct}% (${stats.coveredSizes.size} de ${stats.totalSizes.size} tallas) - ${stats.desc}`);
      }
    });

    categoryStats.forEach(stat => stat.hitList.sort((a, b) => {
      const pctA = parseInt(a.match(/- (\d+)%/)?.[1] || '0');
      const pctB = parseInt(b.match(/- (\d+)%/)?.[1] || '0');
      return pctB - pctA; 
    }));

    // ---------------------------------------------------------
    // 🟢 FASE 2: CACERÍA DEL TOP 10 (Resto de la Cadena)
    // ---------------------------------------------------------
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
          area: row.area || 'General',
          desc: productDictionary[baseSku.toLowerCase()] || row.description || '',
          totalSizes: new Set(), cdSizesAvailable: new Set(), totalSales: 0, totalCdVolume: 0, season: row.temporada?.trim().toUpperCase() || 'SIN TEMPORADA'
        });
      }
      
      const model = globalModels.get(baseSku)!;
      model.totalSizes.add(size);
      model.totalSales += (Number(row.sales2w) || 0);

      const cdStock = Number(row.stock_cd) || 0;
      if (cdStock >= 1) {
        model.cdSizesAvailable.add(size);
        model.totalCdVolume += cdStock;
      }
    });

    let itemsAdded = 0;
    type OpportunityCandidate = { baseSku: string, category: string, area: string, desc: string, totalSizes: Set<string>, cdSizesAvailable: Set<string>, totalSales: number, totalCdVolume: number };
    const oppsByCategory = new Map<string, OpportunityCandidate[]>();

    globalModels.forEach((stats, baseSku) => {
      if (stats.totalSizes.size === 0) return;
      
      const cdHealthRatio = stats.cdSizesAvailable.size / stats.totalSizes.size;
      const isValidSeason = stats.season === 'BÁSICO' || stats.season === currentSeason || stats.season === carryoverSeason;

      // 🛡️ Filtro de Hierro Comercial (Salud CD y Temporada)
      if (cdHealthRatio >= 0.8 && isValidSeason) {
        if (!oppsByCategory.has(stats.category)) oppsByCategory.set(stats.category, []);
        oppsByCategory.get(stats.category)!.push({ baseSku, ...stats });
      }
    });

    oppsByCategory.forEach((opps, category) => {
      // Orden: 1° Mejores Ventas, 2° Mayor Volumen CD (para rellenar)
      opps.sort((a, b) => b.totalSales - a.totalSales || b.totalCdVolume - a.totalCdVolume);
      
      const top10 = opps.slice(0, 10);
      const catContext = categoryStats.get(category);
      const healthData = catContext ? [
        `De ${catContext.totalModels} modelos asignados en esta categoría, solo ${catContext.healthyModels} operan sobre el 80% de su capacidad.`,
        ...catContext.hitList
      ] : ['Sin datos de exhibición previa.'];

      top10.forEach(opp => {
        addToRequest({
          sku: opp.baseSku,
          sizes: Array.from(opp.cdSizesAvailable),
          area: opp.area,
          category: opp.category,
          description: opp.desc,
          timestamp: Date.now(),
          originStore: currentStore,
          requestType: 'opportunity',
          categoryHealth: healthData, 
          salesPulse: opp.totalSales  
        });
        itemsAdded++;
      });
    });

    if (itemsAdded > 0) {
       setHunterFeedback(`🎯 ¡Cacería Exitosa! Se agregaron ${itemsAdded} modelos al canal de oportunidades.`);
    } else {
       setHunterFeedback('🔍 El radar no detectó oportunidades con curva > 80% en el CD.');
    }
    setTimeout(() => setHunterFeedback(null), 4000);
  };

  return { huntOpportunities, hunterFeedback };
};