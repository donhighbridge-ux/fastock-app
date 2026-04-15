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
      activeRaCount: number;   // 🟢 NUEVO: Cuántas tallas tienen RA >= 1
      storeSizesCount: number; // 🟢 NUEVO: Cuántas tallas existen en total
    }>();

    targetData.forEach(row => {
      const parts = row.sku.split('_');
      const baseSkuLower = (parts.length >= 2 ? parts.slice(0, 2).join('_') : row.sku).toLowerCase();
      const size = parts.length > 2 ? parts.slice(2).join('_') : 'Única';
      
      const stock = Number(row.stock) || 0;
      const sales = Number(row.sales2w) || 0; 
      const cd = Number(row.stock_cd) || 0;

      if (!modelRadar.has(baseSkuLower)) {
        modelRadar.set(baseSkuLower, { 
          totalStock: 0, 
          totalSales: 0, 
          cdSizesAvailable: new Set(),
          activeRaCount: 0,
          storeSizesCount: 0
        });
      }
      const radar = modelRadar.get(baseSkuLower)!;
      radar.totalStock += stock;
      radar.totalSales += sales;
      if (cd > 0) {
        radar.cdSizesAvailable.add(size); 
      }

      // 🟢 NUEVO: Contabilidad estricta para la regla del 50%
      radar.storeSizesCount += 1; // Contamos una talla más para este modelo
      const safeRaForRadar = Number(row.ra) || 0;
      if (safeRaForRadar >= 1) {
        radar.activeRaCount += 1; // Contamos si esta talla está viva
      }
    });

    // ------------------------------------------------------------------
    // 🟢 PASADA 2: EL BARRIDO TÁCTICO (Con regla original)
    // ------------------------------------------------------------------
    targetData.forEach(row => {
      const parts = row.sku.split('_');
      const baseSku = parts.length >= 2 ? parts.slice(0, 2).join('_') : row.sku;
      const baseSkuLower = baseSku.toLowerCase();
      const size = parts.length > 2 ? parts.slice(2).join('_') : 'Única';

      const stock = Number(row.stock) || 0;
      const cd = Number(row.stock_cd) || 0;
      const transit = Number(row.transit) || 0;
      const vta = Number(row.sales2w) || Number(row.sales2w) || 0;

      // 🛡️ SANITIZACIÓN ABSOLUTA: Destruye cualquier formato fantasma
      const rawRa = Number(row.ra);
      const safeRa = isNaN(rawRa) ? 0 : rawRa;
      
      const radar = modelRadar.get(baseSkuLower);

      // 🛡️ REGLA DE RECUPERACIÓN DE CURVA (Filtro 50%):
      // ¿El modelo tiene al menos la mitad de sus tallas encendidas?
      const isRadarValid = radar ? (radar.activeRaCount / radar.storeSizesCount) >= 0.5 : false;

      // Le damos el indulto SOLO si la RA es 0, el CD tiene stock, y la masa crítica (>= 50%) está viva.
      const isTallaApagada = safeRa <= 0 && isRadarValid && cd > 0;

      // La talla es rechazada si tiene RA 0 y NO cumple con el indulto del 50%.
      const isNotAssigned = safeRa <= 0 && !isTallaApagada;
      
      // 🛡️ REGLA 1: Protección contra "Quiebre de Origen" (Si CD <= 1 y Stock <= 1, no pedimos)
      if (stock <= 1 && cd <= 1) return;

      // 🛡️ REGLA 2 + CLÁSICA: Decisión de Solicitud
      const hasSalesVelocity = vta >= stock && vta > 0 && transit === 0; // Se vendió lo mismo o más de lo que hay pero con veto de tránsito
      const isLowStock = stock < 2 && transit === 0;    // Lógica de quiebre tradicional

      if ((hasSalesVelocity || isLowStock) && cd > 0 && !isNotAssigned) {
        const qty = hasSalesVelocity ? (vta - stock) : 1;
        console.log(`[MagicSweep] Solicitud: ${baseSku}_${size} | Vta: ${vta} | Stk: ${stock} | Motivo: ${hasSalesVelocity ? 'VELOCIDAD' : 'QUIEBRE'}`);
        
        const draftKey = `${baseSku}-${row.tiendaNombre}`;

        if (sweepDrafts.has(draftKey)) {
          const draft = sweepDrafts.get(draftKey)!;
          if (!draft.sizes.includes(size)) {
             draft.sizes.push(size);
          if (!draft.sizeQuantities) draft.sizeQuantities = {};
             draft.sizeQuantities[size] = qty;
          }
        } else {
          sweepDrafts.set(draftKey, {
            sku: baseSku,
            sizes: [size],
            area: row.area || 'General',
            category: row.categoria,
            description: productDictionary[baseSkuLower] || row.description,
            timestamp: Date.now(),
            originStore: row.tiendaNombre,
            requestType: 'stock',
            sizeQuantities: { [size]: qty } // 🟢 Registro inicial de la cantidad
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
