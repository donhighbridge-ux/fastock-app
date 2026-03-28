import { useState } from 'react';
import { useCart, type CartItem } from '../context/useCart'; // Ajusta la ruta si es necesario
import type { NormalizedRow } from '../types'; // Ajusta la ruta a tus tipos

export const useMagicSweep = (data: NormalizedRow[], currentStore: string | null, isGlobalView: boolean, productDictionary: Record<string, string>) => {
  const { addToRequest } = useCart();
  const [sweepFeedback, setSweepFeedback] = useState<string | null>(null);

  const handleMagicSweep = () => {
    // 1. Limitar el área de escaneo
    const targetData = isGlobalView
      ? data
      : data.filter(row => row.tiendaNombre === currentStore || row.tiendaId === currentStore);

    let itemsAdded = 0;
    const sweepDrafts = new Map<string, CartItem>();

    // ------------------------------------------------------------------
    // 🟢 PASADA 1: EL RADAR ESTRATÉGICO (Mapeo de Modelos para Punto 1)
    // ------------------------------------------------------------------
    const modelRadar = new Map<string, {
      totalStock: number;
      totalSales: number;
      cdSizesAvailable: Set<string>;
    }>();

    targetData.forEach(row => {
      const parts = row.sku.split('_');
      const baseSkuLower = (parts.length >= 2 ? parts.slice(0, 2).join('_') : row.sku).toLowerCase();
      const size = parts.length > 2 ? parts.slice(2).join('_') : 'Única';
      
      const stock = Number(row.stock) || 0;
      const sales = Number(row.sales2w) || 0; 
      const cd = Number(row.stock_cd) || 0;

      if (!modelRadar.has(baseSkuLower)) {
        modelRadar.set(baseSkuLower, { totalStock: 0, totalSales: 0, cdSizesAvailable: new Set() });
      }

      const radar = modelRadar.get(baseSkuLower)!;
      radar.totalStock += stock;
      radar.totalSales += sales;
      if (cd > 0) {
        radar.cdSizesAvailable.add(size); 
      }
    });

    // ------------------------------------------------------------------
    // 🟢 PASADA 2: EL BARRIDO TÁCTICO (Con regla original)
    // ------------------------------------------------------------------
    targetData.forEach(row => {
      const stock = Number(row.stock) || 0;
      const cd = Number(row.stock_cd) || 0;
      const transit = Number(row.transit) || 0;
      const valorRA = row.ra;

      // Detector original de productos No Asignados
      const isNotAssigned = 
        valorRA === '' || 
        valorRA === null || 
        valorRA === undefined || 
        valorRA === 'N/A' || 
        valorRA === 'NaN' || 
        Number(valorRA) <= 0;

      const parts = row.sku.split('_');
      const baseSku = parts.length >= 2 ? parts.slice(0, 2).join('_') : row.sku;
      const baseSkuLower = baseSku.toLowerCase();
      const size = parts.length > 2 ? parts.slice(2).join('_') : 'Única';

      const radar = modelRadar.get(baseSkuLower);
      
      // 🛡️ PROTECCIÓN PUNTO 1: Evitar el "Saldo Inexhibible" (Curva Rota)
      if (radar && radar.totalStock === 0 && radar.totalSales === 0 && radar.cdSizesAvailable.size <= 1) {
        return; // Abortamos, no lo pedimos.
      }

      // 🛡️ REGLA CLÁSICA: Tu lógica original intacta
      if (stock < 2 && cd > 0 && transit === 0 && !isNotAssigned) {
        
        const draftKey = `${baseSku}-${row.tiendaNombre}`;

        if (sweepDrafts.has(draftKey)) {
          const draft = sweepDrafts.get(draftKey)!;
          if (!draft.sizes.includes(size)) {
             draft.sizes.push(size);
          }
        } else {
          sweepDrafts.set(draftKey, {
            sku: baseSku,
            sizes: [size],
            area: row.area || 'General',
            description: productDictionary[baseSkuLower] || row.description,
            timestamp: Date.now(),
            originStore: row.tiendaNombre,
            requestType: 'stock'
          });
        }
        itemsAdded++; 
      }
    });

    // 3. Despacho al Banco Central (CartContext)
    if (itemsAdded > 0) {
      sweepDrafts.forEach(draft => addToRequest(draft));
      setSweepFeedback(`¡Éxito! Se detectaron y agruparon ${itemsAdded} tallas críticas.`);
    } else {
      setSweepFeedback('Tu stock está sano. No se encontraron urgencias.');
    }

    setTimeout(() => setSweepFeedback(null), 4000);
  };

  return { handleMagicSweep, sweepFeedback };
};
