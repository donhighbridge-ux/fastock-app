import type { NormalizedRow } from '../types';
import { getCleanSize } from './stockUtils';

// Helper local para colores (Alineado con el nuevo semáforo)
const getStatusColor = (status: string) => {
  if (status.includes('COMPLETO') && !status.includes('INCOMPLETO')) return "text-green-800 bg-green-100 border border-green-200";
  if (status.includes('QUEDA POCO')) return "text-yellow-800 bg-yellow-100 border border-yellow-200";
  if (status.includes('INCOMPLETO')) return "text-red-800 bg-red-100 border border-red-200";
  return "text-gray-600 bg-gray-50";
};

export const generateComparativeData = (
  storesMap: Map<string, NormalizedRow[]>, 
  sizeMap: Record<string, string>
) => {
  return Array.from(storesMap.entries()).map(([store, storeVariants]) => {
    
    // 1. CLASIFICACIÓN (Nueva lógica de Disponibilidad)
    let hasZero = false;
    let hasOne = false;
    const missingSizes: string[] = [];
    const lowSizes: string[] = [];
    
    storeVariants.forEach(v => {
        // Sanitización robusta
        const stockVal = Number(v.stock) || 0;
        const sizeName = getCleanSize(v.sku, sizeMap);

        // Evaluamos talla por talla según la nueva jerarquía
        if (stockVal === 0) {
            hasZero = true;
            missingSizes.push(sizeName);
        } else if (stockVal === 1) {
            hasOne = true;
            lowSizes.push(sizeName);
        }
    });

    // 2. DETERMINACIÓN DE ESTADO (Prioridad de Anomalías)
    let statusText = "COMPLETO";
    let emoji = "🟢";

    if (hasZero) {
        statusText = "INCOMPLETO";
        emoji = "🔴";
    } else if (hasOne) {
        statusText = "QUEDA POCO";
        emoji = "🟡";
    }

    // 3. GENERACIÓN DE MENSAJE INTELIGENTE (Adaptado)
    let feedbackMessage = "";

    if (statusText === "COMPLETO") {
        feedbackMessage = "Todas las tallas en esta tienda tienen 2 o más unidades. Stock óptimo.";
    } else if (statusText === "INCOMPLETO") {
        feedbackMessage = `Quiebre de stock detectado. Tallas agotadas: ${missingSizes.join(', ')}.`;
    } else if (statusText === "QUEDA POCO") {
        feedbackMessage = `Niveles críticos (1 unidad) en las tallas: ${lowSizes.join(', ')}.`;
    }

    return {
      store,
      total: `${emoji} ${statusText}`, 
      statusColor: getStatusColor(statusText),
      feedbackMessage, 
      sizes: storeVariants.map(v => ({
          size: getCleanSize(v.sku, sizeMap),
          value: Number(v.stock) || 0
      })).sort((a, b) => a.size.localeCompare(b.size, undefined, { numeric: true }))
    };
  }).sort((a, b) => a.store.localeCompare(b.store));
};
