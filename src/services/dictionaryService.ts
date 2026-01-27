import { getFirestore, writeBatch, doc } from 'firebase/firestore';
import { app } from '../firebase-config';
import type { ProductDictionaryItem } from '../types';
import { commitWithRetry, delay, BATCH_SIZE, chunkArray } from '../utils/firestoreUtils';
import Logger from '../utils/logger';

const db = getFirestore(app);

export const uploadDictionaryBatch = async (
  dictionaryData: { products: ProductDictionaryItem[], sizes: { code: string, label: string }[] }
): Promise<void> => {
  
  Logger.log("📚 Iniciando carga de DICCIONARIO...");

  // 1. Subida de Productos (Definiciones)
  const productChunks = chunkArray(dictionaryData.products, BATCH_SIZE);
  
  for (let i = 0; i < productChunks.length; i++) {
    const chunk = productChunks[i];
    const batch = writeBatch(db);
    
    chunk.forEach(item => {
      // Guardamos en una colección global o por org según tu diseño. 
      // Asumo 'product_dictionary' global por ahora.
      const docRef = doc(db, 'product_dictionary', item.sku); 
      batch.set(docRef, item, { merge: true });
    });

    await commitWithRetry(batch);
    Logger.log(`📘 Diccionario Parte ${i + 1}/${productChunks.length}`);
    await delay(100);
  }

  // 2. Subida de Tallas (Configuración)
  if (dictionaryData.sizes.length > 0) {
    const sizeMap = dictionaryData.sizes.reduce((acc, size) => {
      acc[size.code] = size.label;
      return acc;
    }, {} as Record<string, string>);

    const batch = writeBatch(db);
    const configRef = doc(db, 'configuration', 'general'); // Ajusta ruta si es necesario
    batch.set(configRef, { sizeMap }, { merge: true });
    
    await commitWithRetry(batch);
    Logger.log("📏 Mapa de tallas actualizado.");
  }
};
