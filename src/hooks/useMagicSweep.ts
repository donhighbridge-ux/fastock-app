import { useState } from 'react';
import { useCart, type CartItem } from '../context/useCart'; // Ajusta la ruta si es necesario
import type { NormalizedRow } from '../types'; // Ajusta la ruta a tus tipos

export const useMagicSweep = (data: NormalizedRow[], currentStore: string | null, isGlobalView: boolean) => {
  const { addToRequest } = useCart();
  const [sweepFeedback, setSweepFeedback] = useState<string | null>(null);

  const handleMagicSweep = () => {
    // 1. Limitar el área de escaneo
    const targetData = isGlobalView
      ? data
      : data.filter(row => row.tiendaNombre === currentStore || row.tiendaId === currentStore);

    let itemsAdded = 0;
    const sweepDrafts = new Map<string, CartItem>();

    // 2. El Barrido
    targetData.forEach(row => {
      const stock = Number(row.stock) || 0;
      const cd = Number(row.stock_cd) || 0;
      const transit = Number(row.transit) || 0;
      const valorRA = row.ra;

      // Detector de productos No Asignados
      const isNotAssigned = 
        valorRA === '' || 
        valorRA === null || 
        valorRA === undefined || 
        valorRA === 'N/A' || 
        valorRA === 'NaN' || 
        Number.isNaN(Number(valorRA));

      // La Regla de Oro Blindada
      if (stock < 2 && cd > 0 && transit === 0 && !isNotAssigned) {
        
        // ✂️ EL BISTURÍ UNIFICADO (Idéntico a useStockGroupings)
        const parts = row.sku.split('_');
        
        // 1. Aislamos el SKU + COLOR estrictamente (los 2 primeros elementos)
        const baseSku = parts.length >= 2 ? parts.slice(0, 2).join('_') : row.sku;
        
        // 2. Aislamos la TALLA (todo lo que viene del tercer elemento en adelante)
        const size = parts.length > 2 ? parts.slice(2).join('_') : 'Única';

        // 📦 LA LLAVE DE AGRUPACIÓN CORRECTA
        const draftKey = `${baseSku}-${row.tiendaNombre}`;

        if (sweepDrafts.has(draftKey)) {
          // Si la caja ya existe, solo inyectamos la talla
          sweepDrafts.get(draftKey)!.sizes.push(size);
        } else {
          // Si no existe, creamos la caja base
          sweepDrafts.set(draftKey, {
            sku: baseSku,
            sizes: [size],
            area: row.area || 'General',
            description: row.description,
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
