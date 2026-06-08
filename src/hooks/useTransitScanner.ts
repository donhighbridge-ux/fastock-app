import { useState } from 'react';
import { useCart, type CartItem } from '../context/useCart';
import type { NormalizedRow } from '../types';

export const useTransitScanner = (data: NormalizedRow[], currentStore: string | null, isGlobalView: boolean, productDictionary: Record<string, string>) => {
  const { addToRequest } = useCart();
  const [transitFeedback, setTransitFeedback] = useState<string | null>(null);

  const scanTransit = () => {
    const targetData = isGlobalView
      ? data
      : data.filter(row => row.tiendaNombre === currentStore || row.tiendaId === currentStore);

    let itemsAdded = 0;
    const transitDrafts = new Map<string, CartItem>();

    targetData.forEach(row => {
      const transitVal = Number(row.transit) || 0;
      if (transitVal >= 1) {
        const parts = row.sku.split('_');
        const baseSku = parts.length >= 2 ? parts.slice(0, 2).join('_') : row.sku;
        const size = parts.length > 2 ? parts.slice(2).join('_') : 'Única';
        
        const baseSkuLower = baseSku.toLowerCase();
        const draftKey = `${baseSku}-${row.tiendaNombre}`;

        if (transitDrafts.has(draftKey)) {
          const draft = transitDrafts.get(draftKey)!;
          if (!draft.sizes.includes(size)) {
             draft.sizes.push(size);
          }
        } else {
          transitDrafts.set(draftKey, {
            sku: baseSku,
            sizes: [size],
            area: row.area || 'General',
            category: row.categoria || 'GENERAL',
            description: productDictionary[baseSkuLower] || row.description || baseSku,
            timestamp: Date.now(),
            originStore: row.tiendaNombre,
            requestType: 'transit'
          });
        }
        itemsAdded++;
      }
    });

    if (itemsAdded > 0) {
      transitDrafts.forEach(draft => addToRequest(draft));
      setTransitFeedback(`🚚 ¡Radar listo! Se encontraron ${transitDrafts.size} modelos en tránsito.`);
    } else {
      setTransitFeedback('🚚 No se detectaron productos en tránsito para esta selección.');
    }
    
    setTimeout(() => setTransitFeedback(null), 3000);
  };

  return { scanTransit, transitFeedback };
};
