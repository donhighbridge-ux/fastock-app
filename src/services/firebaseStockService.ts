import { getFirestore, writeBatch, doc } from 'firebase/firestore';
import { app } from '../firebase-config'; // Asumiendo que tienes un archivo de configuración de Firebase
import type { NormalizedRow } from '../utils/csvParserLogic';
import Logger from '../utils/logger';

const db = getFirestore(app);

/**
 * Sube datos de stock a Firestore en lotes.
 * @param data - Array de datos normalizados a subir.
 * @param organizationId - ID de la organización para la estructura de datos SaaS.
 */
export const uploadStockBatch = async (data: NormalizedRow[], organizationId: string): Promise<void> => {
  Logger.log(`Iniciando subida en lotes para la organización: ${organizationId}`);
  const batchSize = 500; // Límite de Firestore para un batch
  const chunks: NormalizedRow[][] = [];

  // 1. Dividir el array de datos en chunks de `batchSize`
  for (let i = 0; i < data.length; i += batchSize) {
    chunks.push(data.slice(i, i + batchSize));
  }

  Logger.log(`Datos divididos en ${chunks.length} lotes de hasta ${batchSize} items.`);

  // 2. Procesar cada chunk como una promesa de escritura por lote
  const batchPromises = chunks.map(async (chunk, index) => {
    const batch = writeBatch(db);
    
    chunk.forEach((item) => {
      // 3. Crear un ID de documento determinista para evitar duplicados
      const docId = `${item.tiendaId}_${item.sku}`;
      const docRef = doc(db, `organizations/${organizationId}/stock`, docId);
      
      // 4. Añadir la operación de escritura al lote (sobrescribe si ya existe)
      batch.set(docRef, item);
    });

    await batch.commit();
  });

  // 5. Esperar a que todas las promesas de lote se completen
  await Promise.all(batchPromises);
  Logger.log(`Subida completada. ${chunks.length} lotes procesados exitosamente.`);
};