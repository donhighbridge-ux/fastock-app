import type { NormalizedRow } from '../types';
import { getCleanSize } from './stockUtils';

// Helper local para colores (Paridad con StockTable)
const getStatusColor = (status: string) => {
  if (status.includes('STOCK OK')) return "text-green-600 bg-green-50 border border-green-200";
  if (status.includes('EN TRÁNSITO')) return "text-orange-700 bg-orange-50 border border-orange-200";
  if (status.includes('PIDE SOLO')) return "text-yellow-700 bg-yellow-50 border border-yellow-200";
  if (status.includes('NADA')) return "text-red-700 bg-red-50 border border-red-200";
  return "text-gray-600 bg-gray-50";
};

export const generateComparativeData = (
  storesMap: Map<string, NormalizedRow[]>, 
  sizeMap: Record<string, string>
) => {
  return Array.from(storesMap.entries()).map(([store, storeVariants]) => {
    
    // 1. CLASIFICACIÓN (Lógica Surtido)
    const comingSizes: string[] = [];
    const requestSizes: string[] = [];
    const deadSizes: string[] = [];
    
    storeVariants.forEach(v => {
        const stockVal = Number(v.stock) || 0;
        const transitVal = Number(v.transit) || 0;
        const cdVal = Number(v.stock_cd) || 0; 
        const sizeName = getCleanSize(v.sku, sizeMap);

        if (stockVal <= 1) {
            if (transitVal > 0) comingSizes.push(sizeName);
            else if (cdVal > 0) requestSizes.push(sizeName);
            else deadSizes.push(sizeName);
        }
    });

    // 2. DETERMINACIÓN DE ESTADO (Prioridad exacta del Tablero)
    let statusText = "STOCK OK";
    let emoji = "🟢";

    if (comingSizes.length > 0) {
        statusText = "EN TRÁNSITO";
        emoji = "🟠";
    } else if (requestSizes.length > 0) {
        statusText = "PIDE SOLO...";
        emoji = "🟡";
    } else if (deadSizes.length > 0) {
        statusText = "NADA EN EL CD";
        emoji = "🔴";
    }

    // 3. GENERACIÓN DE MENSAJE INTELIGENTE
    let feedbackMessage = "";

    if (statusText === "STOCK OK") {
        feedbackMessage = "No es necesario que pidas nada, tienes el stock completito.";
    } else if (statusText === "NADA EN EL CD") {
        feedbackMessage = "Lo siento, no hay nada para pedir.";
    } else if (statusText === "PIDE SOLO...") {
        feedbackMessage = `Pide la ${requestSizes.join(', ')}`;
    } else if (statusText === "EN TRÁNSITO") {
        const parts = [];
        // Parte A: Lo que viene
        if (comingSizes.length > 0) parts.push(`Viene en camino la ${comingSizes.join(', ')}.`);
        
        // Parte B: Lo perdido (Dead)
        if (deadSizes.length > 0) parts.push(`No hay nada que hacer con la ${deadSizes.join(', ')}.`);
        
        // Parte C: Lo olvidado (Request)
        if (requestSizes.length > 0) parts.push(`Noté que no te enviaron la ${requestSizes.join(', ')}.`);
        
        feedbackMessage = parts.join('\n\n');
    }

    return {
      store,
      total: `${emoji} ${statusText}`, 
      statusColor: getStatusColor(statusText),
      feedbackMessage, // <--- NUEVO CAMPO CON EL TEXTO FINAL
      sizes: storeVariants.map(v => ({
          size: getCleanSize(v.sku, sizeMap),
          value: Number(v.stock) || 0
      })).sort((a, b) => a.size.localeCompare(b.size, undefined, { numeric: true }))
    };
  }).sort((a, b) => a.store.localeCompare(b.store));
};