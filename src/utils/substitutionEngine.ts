import type { GroupedProduct, NormalizedRow } from '../types';

export interface SubstitutionResult {
  ideales: GroupedProduct[]; // Prioridad 1: Venta local > 0 y Completo
  alternativos: (GroupedProduct & { globalSales: number })[]; // Prioridad 2: Venta local 0, Venta Global > 0 y Completo
}

/**
 * Motor de recomendación táctica para reemplazo de exhibición.
 * Busca productos de la misma área y categoría que estén con stock COMPLETO.
 */
export const findSubstitutes = (
  targetProduct: GroupedProduct,
  localGroupedProducts: GroupedProduct[],
  rawAllData: NormalizedRow[]
): SubstitutionResult => {
  
  // 1. LA CERCA PERIMETRAL
  // Filtramos el universo de la tienda actual para buscar candidatos válidos
  const baseCandidates = localGroupedProducts.filter(p => 
    p.area === targetProduct.area && 
    p.categoria === targetProduct.categoria && 
    p.baseSku !== targetProduct.baseSku && // No recomendar el mismo producto
    p.health.status === 'COMPLETO'         // Condición innegociable
  );

  // 2. PRIORIDAD 1: LOS SUPLENTES IDEALES
  // Tienen stock completo y SÍ se están vendiendo en esta tienda
  const ideales = baseCandidates
    .filter(p => p.sales2w > 0)
    .sort((a, b) => b.sales2w - a.sales2w); // Ordenar de mayor a menor venta local

  // 3. PRIORIDAD 2: LOS CABALLOS OSCUROS
  // Tienen stock completo, NO se venden aquí (0), pero SÍ se venden en otras sucursales
  const sinVentaLocal = baseCandidates.filter(p => p.sales2w === 0);
  
  const alternativos = sinVentaLocal.map(p => {
    // Escaneamos la base de datos completa para sumar las ventas de este SKU en todo el país
    const globalSales = rawAllData
      .filter(row => row.sku.startsWith(`${p.baseSku}_`))
      .reduce((sum, row) => sum + (Number(row.sales2w) || 0), 0);
    
    return {
      ...p,
      globalSales
    };
  })
  .filter(p => p.globalSales > 0) // Exigimos que al menos alguien en el país lo esté vendiendo
  .sort((a, b) => b.globalSales - a.globalSales); // Ordenar de mayor a menor venta global

  return { ideales, alternativos };
};
