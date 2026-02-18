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
  stock: number | string;      // Stock Físico en Tienda
  transit: number | string;    // Stock en Tránsito hacia la tienda
  stock_cd: number | string;   // Stock Disponible en Bodega Central
  sales2w: number | string;    // Velocidad de venta (2 semanas)
  ra: number | string;         // Reposición Automática (Target)
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

export type StockStatus = 'COMPLETO' | 'QUEDA POCO' | 'INCOMPLETO';

export interface StockHealth {
  status: StockStatus;
  emoji: string;
  };

// ==========================================
// 4. CAPA DE NEGOCIO (AGREGADOS)
// ==========================================
// Este es el objeto "Enriquecido" que devuelve useStockGrouping.
// Contiene la data sumada y el diagnóstico de salud.

export interface GroupedProduct {
  baseSku: string;
  name: string;
  stock: number;
  transit: number;
  sales2w: number;
  ra: number;
  stock_cd: number;
  isDictionary: boolean;
  originalSku: string;
  storeName?: string;

  // ✅ AGREGAR: Los nuevos sensores del semáforo
  hasZero: boolean;
  hasOne: boolean;

  // ✅ AGREGAR: La metadata para que funcionen los FILTROS
  area: string;
  categoria: string;
  marca: string;

  health: StockHealth;

}
