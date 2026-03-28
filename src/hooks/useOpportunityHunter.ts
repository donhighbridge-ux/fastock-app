import { useState } from 'react';
import { useCart } from '../context/useCart';
import type { NormalizedRow } from '../types';

export const useOpportunityHunter = (
  data: NormalizedRow[], 
  currentStore: string | null, 
  productDictionary: Record<string, string>
) => {
  const { addToRequest } = useCart();
  const [hunterFeedback, setHunterFeedback] = useState<string | null>(null);

  const huntOpportunities = () => {
    if (!currentStore || currentStore === 'all') {
      setHunterFeedback('⚠️ Selecciona una tienda específica para cazar oportunidades.');
      setTimeout(() => setHunterFeedback(null), 3000);
      return;
    }

    const nationalCurve = new Map<string, Set<string>>(); 
    const cdCurve = new Map<string, Set<string>>(); 
    const storeStock = new Map<string, number>(); 
    const modelMetadata = new Map<string, { area: string, description: string }>();

    // 🟢 PASADA 1: MAPEO GLOBAL
    data.forEach(row => {
      const parts = row.sku.split('_');
      const baseSkuOriginal = parts.length >= 2 ? parts.slice(0, 2).join('_') : row.sku;
      const baseSkuLower = baseSkuOriginal.toLowerCase();
      const size = parts.length > 2 ? parts.slice(2).join('_') : 'Única';

      if (!nationalCurve.has(baseSkuLower)) nationalCurve.set(baseSkuLower, new Set());
      if (!cdCurve.has(baseSkuLower)) cdCurve.set(baseSkuLower, new Set());
      if (!storeStock.has(baseSkuLower)) storeStock.set(baseSkuLower, 0);
      if (!modelMetadata.has(baseSkuLower)) {
        modelMetadata.set(baseSkuLower, { 
          area: row.area || 'General', 
          description: productDictionary[baseSkuLower] || row.description 
        });
      }

      nationalCurve.get(baseSkuLower)!.add(size);

      if ((Number(row.stock_cd) || 0) > 0) {
        cdCurve.get(baseSkuLower)!.add(size);
      }

      if (row.tiendaNombre === currentStore || row.tiendaId === currentStore) {
        const myStock = Number(row.stock) || 0;
        const myTransit = Number(row.transit) || 0;
        storeStock.set(baseSkuLower, storeStock.get(baseSkuLower)! + myStock + myTransit);
      }
    });

    // 🟢 PASADA 2: LA CACERÍA (Evaluación Matemática del 80%)
    let itemsAdded = 0;
    const processedSkus = new Set<string>();

    data.forEach(row => {
      const parts = row.sku.split('_');
      const baseSkuOriginal = parts.length >= 2 ? parts.slice(0, 2).join('_') : row.sku;
      const baseSkuLower = baseSkuOriginal.toLowerCase();
      
      if (processedSkus.has(baseSkuLower)) return;

      const myTotalStock = storeStock.get(baseSkuLower) || 0;
      
      if (myTotalStock === 0) {
         const totalSizes = nationalCurve.get(baseSkuLower)!.size;
         const cdSizesAvailable = cdCurve.get(baseSkuLower)!.size;

         if (totalSizes > 0 && (cdSizesAvailable / totalSizes) >= 0.8) {
           const metadata = modelMetadata.get(baseSkuLower)!;
           const sizesToRequest = Array.from(cdCurve.get(baseSkuLower)!); 

           // 📦 EMPAQUE AL CARRITO CON LA NUEVA ETIQUETA
           addToRequest({
             sku: baseSkuOriginal,
             sizes: sizesToRequest,
             area: metadata.area,
             description: metadata.description,
             timestamp: Date.now(),
             originStore: currentStore,
             requestType: 'opportunity' // 🟢 NUEVO: Etiqueta exclusiva
           });

           itemsAdded++;
           processedSkus.add(baseSkuLower);
         }
      }
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