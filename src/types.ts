/**
 * Representa una fila de datos de stock después de ser normalizada desde el CSV.
 * Esta es la estructura "larga" que se sube a Firestore.
 */
export interface NormalizedRow {
  sku: string;
  description: string;
  marca: string;
  tiendaNombre: string;
  area: string;
  categoria: string;

  // Métricas de Negocio (Numéricas)
  stock: number;      // Stock Local
  sales2w: number;    // Venta 2 Semanas
  transit: number;    // En Tránsito
  ra: number;         // Reposición Automática
  stock_cd: number;   // Stock en Centro de Distribución

  tiendaId?: string;
  [key: string]: any;
}

/**
 * Representa un ítem en el diccionario de productos.
 * Contiene metadatos amigables para un SKU específico.
 */
export interface ProductDictionaryItem {
  sku: string;
  name: string; // El nombre amigable, ej: "Polera Logo Clásico"
  category: string;
  area: string;
}