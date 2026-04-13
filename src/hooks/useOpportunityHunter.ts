// src/hooks/useOpportunityHunter.ts
import { useState } from 'react';
import { useCart } from '../context/useCart';
import type { NormalizedRow } from '../types';
import { getCarryover } from '../utils/hunterRules';
import { useStoreRadar } from './useStoreRadar';
import { useGlobalHunter } from './useGlobalHunter';

export const useOpportunityHunter = (
  data: NormalizedRow[], 
  currentStore: string | null, 
  productDictionary: Record<string, string>,
  currentSeason: string,
  curveDictionary: Record<string, { mode1: number; mode2: number | null }>
) => {
  const { addToRequest } = useCart();
  const [hunterFeedback, setHunterFeedback] = useState<string | null>(null);
  
  // Instanciamos los nuevos módulos
  const { scanStore } = useStoreRadar();
  const { huntGlobal } = useGlobalHunter();

  const huntOpportunities = () => {
    if (!currentStore || currentStore === 'all') {
      setHunterFeedback('⚠️ Selecciona una tienda específica para cazar oportunidades.');
      setTimeout(() => setHunterFeedback(null), 3000);
      return;
    }

    const carryoverSeason = getCarryover(currentSeason);

    // 🟢 FASE 1: Radar de Tienda
    const { categoryStats, myStoreSkus } = scanStore(
      data, currentStore, productDictionary, currentSeason, carryoverSeason, curveDictionary
    );

    // 🟢 FASE 2: Cacería Global
    const { oppsByCategory } = huntGlobal(
      data, currentStore, myStoreSkus, productDictionary, currentSeason, carryoverSeason, curveDictionary
    );

    // 🟢 FASE 3: Despacho y Ensamblaje
    let itemsAdded = 0;

    oppsByCategory.forEach((opps, statKey) => {
      // 1. Ordenamiento de negocio
      opps.sort((a, b) => b.totalSales - a.totalSales || b.totalCdVolume - a.totalCdVolume);
      
      const top10 = opps.slice(0, 10);
      const catContext = categoryStats.get(statKey); 

      // 🟢 NUEVA REGLA: Interruptor de Categoría Sana
      // Si más del 80% de los modelos asignados están sanos, cancelamos recomendaciones.
      if (catContext && catContext.totalModels > 0) {
        const categoryHealthRatio = catContext.healthyModels / catContext.totalModels;
        if (categoryHealthRatio > 0.8) return; // Salimos de esta categoría sin agregar nada al carrito
      }
      
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
