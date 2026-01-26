/**
 * src/types.ts
 * LA LEY. Define estrictamente qué constituye un dato válido en nuestro universo.
 * No se permite ambigüedad.
 */

export interface NormalizedRow {
  // Identidad del Producto (Inmutable)
  sku: string;
  description: string;
  marca: string;
  categoria: string;
  area: string;

  // Contexto de Ubicación
  tiendaId: string;     // Obligatorio. Sin ID no hay trazabilidad.
  tiendaNombre: string;

  // Métricas de Negocio (El Núcleo Numérico)
  // Todo debe ser numérico. Nada de strings, nada de nulls.
  stock: number;      // Stock Físico en Tienda
  transit: number;    // Stock en Tránsito hacia la tienda
  stock_cd: number;   // Stock Disponible en Bodega Central
  sales2w: number;    // Velocidad de venta (2 semanas)
  ra: number;         // Reposición Automática (Target)
}

// Nota: Eliminamos ProductDictionaryItem de aquí si no se usa en la lógica crítica, 
// o lo mantenemos separado. Por ahora nos enfocamos en NormalizedRow.
export interface ProductDictionaryItem {
  sku: string;
  name: string;
  category: string;
  area: string;
}

// ==========================================
// 3. CAPA DE VISUALIZACIÓN (UI TYPES)
// ==========================================
// Estos tipos no existen en la base de datos. 
// Son estructuras calculadas en memoria para el semáforo del Frontend.

export type StockStatus = 'STOCK OK' | 'EN TRÁNSITO' | 'PIDE SOLO...' | 'NADA EN EL CD';

export interface StockHealth {
  status: StockStatus;
  emoji: string;
  details: {
    coming: string[];  // Tallas que vienen viajando
    request: string[]; // Tallas que se pueden pedir al CD
    dead: string[];    // Tallas muertas (sin stock ni reposición)
  };
}

// ==========================================
// 4. CAPA DE NEGOCIO (AGREGADOS)
// ==========================================
// Este es el objeto "Enriquecido" que devuelve useStockGrouping.
// Contiene la data sumada y el diagnóstico de salud.

export interface GroupedProduct {
  baseSku: string;
  name: string;
  originalSku: string;
  
  // Métricas Agregadas
  stock: number;
  transit: number;
  stock_cd: number;
  sales2w: number;
  ra: number;
  
  // Diagnóstico
  health: StockHealth; // <--- AQUÍ ESTÁ LA MAGIA. Tipado estricto.

  // UI Helpers
  comingSizes: string[];
  requestSizes: string[];
  deadSizes: string[];
  hasZero: boolean;
  hasOne: boolean;
  storeName?: string;
}
