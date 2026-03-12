import { useMemo } from 'react';
import type { NormalizedRow } from '../types';
import type { TrackingItem } from '../context/useCart';

export type TrackingStatus = 'NADA EN EL CD' | 'EN CAMINO' | 'SOLICITAR';

export interface ProcessedTrackingItem extends TrackingItem {
  status: TrackingStatus;
}

export const useTrackingEngine = (
  trackingList: TrackingItem[], 
  rawData: NormalizedRow[],
  currentStore: string | null
) => {
  
  const processedList = useMemo(() => {
    // 1. Filtramos la lista para la tienda actual
    const storeTrackingList = (!currentStore || currentStore === 'all' || currentStore === 'Todas las Tiendas')
      ? trackingList
      : trackingList.filter(item => item.originStore === currentStore);

    // 2. Evaluamos el estado logístico de cada ítem
    return storeTrackingList.map(item => {
      // Buscamos las filas en el Excel crudo que coincidan con este SKU y esta tienda
      const relevantRows = rawData.filter(r => 
        r.sku.toLowerCase().startsWith(item.sku.toLowerCase()) && 
        r.tiendaNombre === item.originStore
      );

      let hasCD = false;
      let hasTransit = false;

      // Revisamos solo las tallas que el usuario está siguiendo
      const safeSizes = item.sizes || [];
      
      safeSizes.forEach(size => {
        const exactSku = `${item.sku.toLowerCase()}_${size.toLowerCase()}`;
        const row = relevantRows.find(r => r.sku.toLowerCase() === exactSku);
        
        if (row) {
          if ((Number(row.stock_cd) || 0) > 0) hasCD = true;
          if ((Number(row.transit) || 0) > 0) hasTransit = true;
        }
      });

      // 3. Jerarquía de Estados (El CD manda, porque significa que ya podemos pedir)
      let status: TrackingStatus = 'NADA EN EL CD';
      if (hasCD) {
        status = 'SOLICITAR';
      } else if (hasTransit) {
        status = 'EN CAMINO';
      }

      return { ...item, status };
    });
  }, [trackingList, rawData, currentStore]);

  return { processedList };
};
