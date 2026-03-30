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

// --- NUEVAS ESTRUCTURAS DE MEMORIA ---
    const skuCategory = new Map<string, string>(); 
    const skuGlobalSizes = new Map<string, Set<string>>(); 
    const cdSizes = new Map<string, Set<string>>(); 
    const myStoreStock = new Map<string, { stock: number, transit: number }>();
    const modelMetadata = new Map<string, { area: string, description: string, originalSku: string }>();
    
    // Memoria del Tribunal de Pares: baseSku -> storeName -> { raSizes, stockSizes, transitSizes }
    type PeerStats = { raSizes: Set<string>, stockSizes: Set<string>, transitSizes: Set<string> };
    const peerStores = new Map<string, Map<string, PeerStats>>();

    // ------------------------------------------------------------------
    // 🟢 PASADA 1: MAPEO GLOBAL Y RECOLECCIÓN DE PRUEBAS
    // ------------------------------------------------------------------
    data.forEach(row => {
      const parts = row.sku.split('_');
      const baseSkuOriginal = parts.length >= 2 ? parts.slice(0, 2).join('_') : row.sku;
      const baseSkuLower = baseSkuOriginal.toLowerCase();
      const size = parts.length > 2 ? parts.slice(2).join('_') : 'Única';
      
      const area = row.area?.trim().toUpperCase() || 'SIN AREA';
      const cat = row.categoria?.trim().toUpperCase() || 'SIN CATEGORIA';
      const categoryKey = `${area}_${cat}`;

      if (!skuCategory.has(baseSkuLower)) skuCategory.set(baseSkuLower, categoryKey);
      if (!skuGlobalSizes.has(baseSkuLower)) skuGlobalSizes.set(baseSkuLower, new Set());
      if (!cdSizes.has(baseSkuLower)) cdSizes.set(baseSkuLower, new Set());
      if (!myStoreStock.has(baseSkuLower)) myStoreStock.set(baseSkuLower, { stock: 0, transit: 0 });
      if (!peerStores.has(baseSkuLower)) peerStores.set(baseSkuLower, new Map());
      if (!modelMetadata.has(baseSkuLower)) {
        modelMetadata.set(baseSkuLower, { 
          area: row.area || 'General', 
          description: productDictionary[baseSkuLower] || row.description,
          originalSku: baseSkuOriginal
        });
      }

      skuGlobalSizes.get(baseSkuLower)!.add(size);

      if ((Number(row.stock_cd) || 0) > 0) {
        cdSizes.get(baseSkuLower)!.add(size);
      }

      if (row.tiendaNombre === currentStore || row.tiendaId === currentStore) {
        const stock = myStoreStock.get(baseSkuLower)!;
        stock.stock += Number(row.stock) || 0;
        stock.transit += Number(row.transit) || 0;
      } else {
        const storeName = row.tiendaNombre || row.tiendaId || 'Unknown';
        const peersForSku = peerStores.get(baseSkuLower)!;
        if (!peersForSku.has(storeName)) {
          peersForSku.set(storeName, { raSizes: new Set(), stockSizes: new Set(), transitSizes: new Set() });
        }
        const stats = peersForSku.get(storeName)!;
        
        const safeRa = (row.ra === 'N/A' || row.ra === '' || row.ra == null || row.ra === 'NaN') ? 0 : Number(row.ra) || 0;
        
        if (safeRa >= 1) stats.raSizes.add(size);
        if ((Number(row.stock) || 0) >= 1) stats.stockSizes.add(size);
        if ((Number(row.transit) || 0) >= 1) stats.transitSizes.add(size);
      }
    });

    // ------------------------------------------------------------------
    // 🟢 PASADA 1.5: INTELIGENCIA DE ENJAMBRE (Regla 2: Baseline Dinámico)
    // ------------------------------------------------------------------
    const categoryBaselines = new Map<string, number>();
    const categorySizeCounts = new Map<string, number[]>();
    
    skuGlobalSizes.forEach((sizes, baseSkuLower) => {
      const cat = skuCategory.get(baseSkuLower)!;
      if (!categorySizeCounts.has(cat)) categorySizeCounts.set(cat, []);
      categorySizeCounts.get(cat)!.push(sizes.size);
    });

    categorySizeCounts.forEach((counts, cat) => {
      const frequency: Record<number, number> = {};
      let maxFreq = 0;
      let mode = 0;
      counts.forEach(c => {
        frequency[c] = (frequency[c] || 0) + 1;
        if (frequency[c] > maxFreq) {
          maxFreq = frequency[c];
          mode = c;
        }
      });
      categoryBaselines.set(cat, mode || 1); 
    });

    // ------------------------------------------------------------------
    // 🟢 PASADA 2: LA CACERÍA Y EL TRIBUNAL
    // ------------------------------------------------------------------
    let itemsAdded = 0;

    skuGlobalSizes.forEach((_, baseSkuLower) => {
      // 🛡️ FILTRO 1: Tienda en cero absoluto
      const myStock = myStoreStock.get(baseSkuLower)!;
      if (myStock.stock > 0 || myStock.transit > 0) return;

      // 🛡️ FILTRO 2: Integridad del CD vs Inteligencia de Enjambre (Regla 2)
      const cat = skuCategory.get(baseSkuLower)!;
      const baseline = categoryBaselines.get(cat)!; 
      const cdSizesAvailable = cdSizes.get(baseSkuLower)!; 
      
      if (cdSizesAvailable.size === 0 || (cdSizesAvailable.size / baseline) < 0.8) return;

      // 🛡️ FILTRO 3: Tribunal de las Tiendas Pares (Regla 1 Estricta)
      let hasValidPeer = false;
      const peers = peerStores.get(baseSkuLower)!;

      for (const stats of peers.values()) {
        let hasAllRa = true;
        let stockMatchCount = 0;
        let transitMatchCount = 0;

        cdSizesAvailable.forEach(size => {
          if (!stats.raSizes.has(size)) hasAllRa = false; 
          if (stats.stockSizes.has(size)) stockMatchCount++; 
          if (stats.transitSizes.has(size)) transitMatchCount++; 
        });

        if (hasAllRa) {
          const stockRatio = stockMatchCount / cdSizesAvailable.size;
          const hasFullTransit = transitMatchCount === cdSizesAvailable.size;

          if (stockRatio >= 0.8 || hasFullTransit) {
            hasValidPeer = true;
            break; 
          }
        }
      }

      // 📦 EMPAQUETADO FINAL
      if (hasValidPeer) {
        const metadata = modelMetadata.get(baseSkuLower)!;
        const sizesToRequest = Array.from(cdSizesAvailable);

        addToRequest({
          sku: metadata.originalSku.toUpperCase(),
          sizes: sizesToRequest,
          area: metadata.area,
          description: metadata.description,
          timestamp: Date.now(),
          originStore: currentStore,
          requestType: 'opportunity'
        });
        itemsAdded++;
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