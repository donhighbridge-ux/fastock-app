// NOTA: 'import type' es obligatorio para interfaces en modo aislado
import type { FirestoreDataConverter } from 'firebase/firestore'; 
import type { NormalizedRow } from '../types';

/**
 * CONVERTIDOR DE SEGURIDAD
 * Filtra la basura antes de que toque la base de datos.
 */
export const stockConverter: FirestoreDataConverter<NormalizedRow> = {
  toFirestore: (modelObject: NormalizedRow) => {
    return {
      sku: modelObject.sku,
      description: modelObject.description,
      marca: modelObject.marca,
      categoria: modelObject.categoria,
      area: modelObject.area,
      
      tiendaId: modelObject.tiendaId,
      tiendaNombre: modelObject.tiendaNombre,

      // Casteo agresivo a número para evitar NaN o strings
      stock: Number(modelObject.stock || 0),
      transit: Number(modelObject.transit || 0),
      stock_cd: Number(modelObject.stock_cd || 0),
      sales2w: Number(modelObject.sales2w || 0),
      ra: Number(modelObject.ra || 0)
    };
  },
  fromFirestore: (snapshot, options) => {
    const data = snapshot.data(options);
    return data as NormalizedRow;
  }
};
