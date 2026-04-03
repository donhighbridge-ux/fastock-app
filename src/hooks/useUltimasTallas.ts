import { useState } from 'react';
import { useCart } from '../context/useCart';
import type { NormalizedRow } from '../types';

export const useUltimasTallas = (
  data: NormalizedRow[], 
  currentStore: string | null, 
  productDictionary: Record<string, string>
) => {
  const { addToRequest } = useCart();
  const [ultimasFeedback, setUltimasFeedback] = useState<string | null>(null);
  const [isScanningUltimas, setIsScanningUltimas] = useState(false);

  const scanUltimasTallas = () => {
    if (!currentStore || currentStore === 'all' || currentStore === 'Todas las Tiendas') {
      setUltimasFeedback('⚠️ Selecciona una tienda específica para auditar Últimas Tallas.');
      setTimeout(() => setUltimasFeedback(null), 3000);
      return;
    }

    setIsScanningUltimas(true);
    setUltimasFeedback('Escaneando fin de ciclo...');

    try {
      const targetData = data.filter(row => row.tiendaNombre === currentStore || row.tiendaId === currentStore);

      // ------------------------------------------------------------------
      // 🟢 PASADA 1: EL RADAR DE LA FAMILIA (La sumatoria)
      // ------------------------------------------------------------------
      const radar = new Map<string, {
        totalSizes: number;
        activeRaSizes: number;
        deadStoreSizes: number;
        deadCdSizes: number;
        deadTransitSizes: number;
        area: string;
        description: string;
        sizesLeftOnFloor: string[]; // Guardamos qué tallas siguen físicamente en la tienda
        totalSales2W: number; // 🟢 NUEVO
        totalRa: number;      // 🟢 NUEVO
        category: string;     // 🟢 NUEVO (para el punto 3)
      }>();

      targetData.forEach(row => {
        const parts = row.sku.split('_');
        const baseSkuOriginal = parts.length >= 2 ? parts.slice(0, 2).join('_') : row.sku;
        const baseSkuLower = baseSkuOriginal.toLowerCase();
        const size = parts.length > 2 ? parts.slice(2).join('_') : 'Única';

        const stock = Number(row.stock) || 0;
        const cd = Number(row.stock_cd) || 0;
        const transit = Number(row.transit) || 0;
        const rawRa = Number(row.ra);
        const safeRa = isNaN(rawRa) ? 0 : rawRa;
        const sales = Number(row.sales2w) || 0;
        const raValue = safeRa;

        // 🛡️ REGLA ANTI-FANTASMAS: Si no tiene RA y no existe físicamente, no se cuenta.
        if (safeRa <= 0 && stock === 0 && cd === 0 && transit === 0) {
          return; 
        }

        if (!radar.has(baseSkuOriginal)) {
          radar.set(baseSkuOriginal, {
            totalSizes: 0,
            activeRaSizes: 0,
            deadStoreSizes: 0,
            deadCdSizes: 0,
            deadTransitSizes: 0,
            area: row.area || 'General',
            description: productDictionary[baseSkuLower] || row.description,
            sizesLeftOnFloor: [],
            totalSales2W: 0,
            totalRa: 0,
            category: row.categoria?.trim().toUpperCase() || 'SIN CATEGORÍA'
          });
        }

        const modelStats = radar.get(baseSkuOriginal)!;
        modelStats.totalSizes += 1;

        if (safeRa >= 1) modelStats.activeRaSizes += 1;
        if (stock === 0) modelStats.deadStoreSizes += 1;
        if (cd === 0) modelStats.deadCdSizes += 1;
        if (transit === 0) modelStats.deadTransitSizes += 1;
        
        if (stock > 0) modelStats.sizesLeftOnFloor.push(size);

        modelStats.totalSales2W += sales; // Acumular venta
        modelStats.totalRa += raValue;    // Acumular RA
      });

      // ------------------------------------------------------------------
      // 🟢 PASADA 2: EL TRIBUNAL DEL FIN DE CICLO
      // ------------------------------------------------------------------
      let itemsAdded = 0;

      radar.forEach((stats, baseSku) => {
        // Prevenir divisiones por cero
        if (stats.totalSizes === 0) return;

        const raRatio = stats.activeRaSizes / stats.totalSizes;
        const storeDeadRatio = stats.deadStoreSizes / stats.totalSizes;
        const cdDeadRatio = stats.deadCdSizes / stats.totalSizes;
        const transitDeadRatio = stats.deadTransitSizes / stats.totalSizes;

        // 🛡️ LOS 4 FILTROS IMPLACABLES (Aquí puedes editar el 0.8 a tu gusto)
        const isCurrentSeason = raRatio >= 0.8;      // El 80% de las tallas tienen RA asignada
        const isStoreDying = storeDeadRatio >= 0.8;  // El 80% de las tallas en tienda están agotadas
        const isCdDead = cdDeadRatio >= 0.8;         // El 80% de las tallas en CD están agotadas
        const isTransitDead = transitDeadRatio >= 0.8; // El 80% de las tallas en tránsito están agotadas

        if (isCurrentSeason && isStoreDying && isCdDead && isTransitDead) {
          
          // 🛡️ REGLA DE IMPACTO COMERCIAL
          const isTotallySoldOut = stats.sizesLeftOnFloor.length === 0;
          const hasHighImpactVenta = stats.totalSales2W >= (stats.totalRa * 0.5);

          // Si está agotado total PERO no vendió el 50% de su RA, lo ignoramos (es basura antigua)
          if (isTotallySoldOut && !hasHighImpactVenta) {
            return; 
          }

          addToRequest({
            sku: baseSku,
            sizes: isTotallySoldOut ? ['AGOTADO TOTAL (Best Seller)'] : stats.sizesLeftOnFloor,
            area: stats.area,
            category: stats.category, // 🟢 Pasamos la categoría al carrito
            description: stats.description,
            timestamp: Date.now(),
            originStore: currentStore,
            requestType: 'ultimas' // 🟢 Etiqueta para que puedas pintarlo de otro color en la UI
          });
          itemsAdded++;
        }
      });

      if (itemsAdded > 0) {
        setUltimasFeedback(`☠️ ¡Reporte Listo! Se encontraron ${itemsAdded} modelos en etapa de Últimas Tallas.`);
      } else {
        setUltimasFeedback('✅ Inventario sano. Ningún producto de temporada ha entrado en fin de ciclo.');
      }

    } catch (error) {
      console.error("Error en escaneo de Últimas Tallas:", error);
      setUltimasFeedback('❌ Error procesando el reporte.');
    } finally {
      setIsScanningUltimas(false);
      setTimeout(() => setUltimasFeedback(null), 4000);
    }
  };

  return { scanUltimasTallas, isScanningUltimas, ultimasFeedback };
};
