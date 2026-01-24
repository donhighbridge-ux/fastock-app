/**
 * src/utils/csvConfig.ts
 * LA INTELIGENCIA DE TRADUCCIÓN.
 * Configura qué buscar en el Excel y a qué propiedad de NormalizedRow corresponde.
 */

import type { NormalizedRow } from '../types';

// Definimos un tipo para las claves numéricas permitidas
export type MetricKey = keyof Pick<NormalizedRow, 'stock' | 'transit' | 'stock_cd' | 'sales2w' | 'ra'>;

interface MetricConfig {
  targetField: MetricKey; // El nombre en nuestra DB (La Ley)
  aliases: string[];      // Los nombres posibles en el Excel (El Caos)
}

// Aquí está la magia. Si el Excel trae "En Viaje", nosotros entendemos "transit".
export const METRIC_MAPPINGS: MetricConfig[] = [
  { 
    targetField: 'stock', 
    aliases: ['stock tienda', 'stock local', 'inv. final', 'on hand'] 
  },
  { 
    targetField: 'transit', 
    aliases: ['transito', 'tránsito', 'en transito', 'en viaje', 'in transit'] 
  },
  { 
    targetField: 'stock_cd', 
    aliases: ['stock cd', 'bodega central', 'cd disponible', 'stock_cd'] 
  },
  { 
    targetField: 'sales2w', 
    aliases: ['venta 2w', 'venta 2 semanas', 'sales last 2w'] 
  },
  { 
    targetField: 'ra', 
    aliases: ['ra', 'reposicion automatica', 'target stock'] 
  }
];

// Lista negra de "Falsas Tiendas" (Columnas que parecen tiendas pero no lo son)
export const STORE_BLACKLIST = [
  'total', 'total general', 'suma', 'promedio', 'diferencia', 
  'stock', 'transito', 'sku', 'descripcion', 'estilo', 'color'
];
