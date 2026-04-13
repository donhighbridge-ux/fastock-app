import { useMemo } from 'react';
import type { NormalizedRow } from '../types';

export interface CurveRules {
  mode1: number;
  mode2: number | null;
}

export const useCurveDictionary = (data: NormalizedRow[]): Record<string, CurveRules> => {
  return useMemo(() => {
    const dictionary: Record<string, CurveRules> = {};
    if (!data || data.length === 0) return dictionary;

    // 1. RECOLECCIÓN: Agrupar por Área -> Categoría -> Modelo -> Cantidad de Tallas
    const sizeCounts: Record<string, Record<string, Record<string, Set<string>>>> = {};

    // 🟢 MAPA DE RELEVANCIA: Solo productos con huella en CD pueden votar
    const skusWithCdStock = new Set<string>();

    // 🟢 NUEVOS RASTREADORES PARA LA REGLA DEL 50%
    // Estructura: SKU -> Tienda -> { raSizes: Set, floorSizes: Set }
    const skuStoreHealth: Record<string, Record<string, { ra: Set<string>, floor: Set<string> }>> = {};
    const totalStores = new Set<string>();
    
    data.forEach(row => {
      const area = row.area?.trim().toUpperCase() || 'SIN_AREA';
      const cat = row.categoria?.trim().toUpperCase() || 'SIN_CATEGORIA';
      const parts = row.sku.split('_');
      const baseSku = parts.length >= 2 ? parts.slice(0, 2).join('_') : row.sku;
      const size = parts.length > 2 ? parts.slice(2).join('_') : 'Única';

      if (!sizeCounts[area]) sizeCounts[area] = {};
      if (!sizeCounts[area][cat]) sizeCounts[area][cat] = {};
      if (!sizeCounts[area][cat][baseSku]) sizeCounts[area][cat][baseSku] = new Set();

      // Capturamos todas las tallas que el Excel dice que existen
      sizeCounts[area][cat][baseSku].add(size);
      
      // Pero anotamos si el producto está "vivo" en el CD
      if (Number(row.stock_cd) >= 1) {
        skusWithCdStock.add(baseSku);
      }

      // 🟢 REGISTRO DE SALUD POR TIENDA
      totalStores.add(row.tiendaNombre);
      if (!skuStoreHealth[baseSku]) skuStoreHealth[baseSku] = {};
      if (!skuStoreHealth[baseSku][row.tiendaNombre]) {
        skuStoreHealth[baseSku][row.tiendaNombre] = { ra: new Set(), floor: new Set() };
      }

      const storePresence = skuStoreHealth[baseSku][row.tiendaNombre];
      if (Number(row.ra) >= 1) storePresence.ra.add(size);
      if (Number(row.stock) >= 1 || Number(row.transit) >= 1) storePresence.floor.add(size);
    });

    // 2. MATEMÁTICA ESTADÍSTICA: Calcular Frecuencias (Modas)
    const categoryModes: Record<string, Record<string, { count: number, freq: number }[]>> = {};

    Object.keys(sizeCounts).forEach(area => {
      categoryModes[area] = {};
      Object.keys(sizeCounts[area]).forEach(cat => {
        const freqMap: Record<number, number> = {};
        
        Object.keys(sizeCounts[area][cat]).forEach(baseSku => {
          const sizeSet = sizeCounts[area][cat][baseSku];
          const totalModelSizes = sizeSet.size;
          if (totalModelSizes === 0) return;

          // 1. ¿Vota por CD? (Presencia mínima)
          let canVote = skusWithCdStock.has(baseSku);

          // 2. ¿Vota por Presencia en Tienda (Regla del 50%)?
          if (!canVote) {
            let healthyStoresCount = 0;
            const storeData = skuStoreHealth[baseSku] || {};
            
            Object.values(storeData).forEach(health => {
              const raHealth = health.ra.size / totalModelSizes;
              const floorHealth = health.floor.size / totalModelSizes;
              // La tienda vota positivo si tiene salud de RA y salud de Piso (Stock+Transit) >= 80%
              if (raHealth >= 0.8 && floorHealth >= 0.8) {
                healthyStoresCount++;
              }
            });

            // Si el 50% de las tiendas del país lo tienen sano, se le permite definir la moda
            if (totalStores.size > 0 && (healthyStoresCount / totalStores.size) >= 0.5) {
              canVote = true;
            }
          }

          if (canVote) {
            freqMap[totalModelSizes] = (freqMap[totalModelSizes] || 0) + 1;
          }
        });

        // Ordenar de mayor frecuencia (Moda 1) a menor frecuencia
        const sortedFrequencies = Object.entries(freqMap)
          .map(([count, freq]) => ({ count: Number(count), freq }))
          .sort((a, b) => b.freq - a.freq);

        categoryModes[area][cat] = sortedFrequencies;
      });
    });

    // 3. LÓGICA DE NEGOCIO: Estándares de Calidad y Doble Curva
    const ACCESSORIES_AREAS = ['ACCESSORIES', 'ACCESORIOS', 'SIN_AREA', 'SIN AREA', 'KID ACC', 'TOD ACC'];
    const ACCESSORIES_CATS = ['CALCETINES', 'CARTERAS', 'JOCKEYS Y GORROS', 'BISUTERIA', 'BUFANDAS', 'CINTURONES'];
    const BOTTOMS = ['JEANS', 'PANTALONES', 'SHORTS'];

    Object.keys(categoryModes).forEach(area => {
      // 🛡️ El Ancla de Poleras (Escudo de Tops)
      const polerasFreqs = categoryModes[area]['POLERAS'];
      const polerasMode1 = polerasFreqs && polerasFreqs.length > 0 ? polerasFreqs[0].count : 0;

      Object.keys(categoryModes[area]).forEach(cat => {
        const freqs = categoryModes[area][cat];
        if (freqs.length === 0) return;

        // 🟢 APLICACIÓN DEL ESTÁNDAR DE 6
        const isAccessory = ACCESSORIES_AREAS.includes(area) || ACCESSORIES_CATS.includes(cat);
        let mode1 = freqs[0].count;

        if (!isAccessory) {
          // Si es ropa y la moda detectada es < 6, buscamos si hay una moda sana disponible
          if (mode1 < 6) {
            const saneMode = freqs.find(f => f.count >= 6);
            mode1 = saneMode ? saneMode.count : 6; // Si no hay nada >= 6, forzamos el estándar 6
          }
        }

        let mode2: number | null = null;

        // Doble Curva para Bottoms (Pantalones)
        if (BOTTOMS.includes(cat) && freqs.length > 1) {
          const potentialMode2 = freqs[1].count;
          // El Escudo de Tops: La curva corta debe ser al menos igual a las poleras
          if (polerasMode1 > 0 && potentialMode2 >= polerasMode1) {
            mode2 = potentialMode2;
          }
        }

        dictionary[`${area}_${cat}`] = { mode1, mode2 };
      });
    });

    console.log("📘 Diccionario de Curvas Dinámico Generado:", dictionary);
    return dictionary;
  }, [data]);
};
