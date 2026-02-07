/**
 * Configura qué buscar en el Excel y a qué propiedad de NormalizedRow corresponde.
 */

import type { NormalizedRow } from '../types';

// ==========================================
// 1. DEFINICIONES DE TIPOS (Blindaje)
// ==========================================

// Interfaz para asegurar que solo buscamos campos que existen en el tipo de dato
interface MetricMappingDef {
  id: string;
  aliases: string[];
  targetField: keyof NormalizedRow; 
}

// ==========================================
// 2. COLUMNAS GLOBALES (Fila 3 / Index 2)
// ==========================================
// Estas columnas aparecen UNA sola vez por fila de producto.
// Mapeo: Propiedad en NormalizedRow -> Lista de posibles encabezados en Excel
export const STATIC_COLUMNS: Record<string, string[]> = {
  sku: ['SKU'], 
  marca: ['Marca'],
  area: ['Área', 'Area'],
  categoria: ['Categoría', 'Categoria'],
  description: ['Descripción', 'Descripcion'], 
  stock_cd: ['Stock CD'], // Global según VibeCoded 
};

// ==========================================
// 3. COLUMNAS LOCALES (Repetidas por Tienda)
// ==========================================
// Estas columnas se buscan DENTRO del rango de columnas de cada tienda.
export const METRIC_MAPPINGS: MetricMappingDef[] = [
  { 
    id: 'stock', 
    aliases: ['Stock tienda'], // Literal exacto
    targetField: 'stock' 
  },
  { 
    id: 'transit', 
    aliases: ['Tránsito'], // Literal exacto
    targetField: 'transit' 
  },
  { 
    id: 'sales', 
    aliases: ['Venta 2W'], // Literal exacto 
    targetField: 'sales2w' 
  },
  { 
    id: 'ra', 
    aliases: ['RA.'], // Literal exacto con punto opcional
    targetField: 'ra' 
  }
];
