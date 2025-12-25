import { getFirestore, writeBatch, doc, WriteBatch, getCountFromServer, collection } from 'firebase/firestore';
import { app } from '../firebase-config'; // Asumiendo que tienes un archivo de configuración de Firebase
import type { NormalizedRow, ProductDictionaryItem } from '../types';
import Logger from '../utils/logger';

const db = getFirestore(app);

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function verifyTotalCount(organizationId: string, expectedCount: number) {
  Logger.log("🕵️ Iniciando auditoría de conteo...");
  const coll = collection(db, `organizations/${organizationId}/stock`);
  const snapshot = await getCountFromServer(coll);
  const total = snapshot.data().count;

  Logger.log(`📊 Total en CSV procesado: ${expectedCount}`);
  Logger.log(`☁️ Total en Firebase: ${total}`);

  if (total === expectedCount) {
    Logger.log("✅ ¡MATCH PERFECTO! No falta nada.");
  } else {
    Logger.log(`⚠️ ALERTA: Faltan ${expectedCount - total} documentos.`);
  }
}

/**
 * Intenta ejecutar un batch.commit() y reintenta automáticamente en caso de fallo
 * hasta un número máximo de intentos.
 * @param batch El WriteBatch de Firestore a ejecutar.
 * @param attempts El número de intentos restantes.
 */
async function commitWithRetry(batch: WriteBatch, attempts = 3): Promise<void> {
  try {
    await batch.commit();
  } catch (error) {
    if (attempts > 1) {
      Logger.warn(`⚠️ Fallo temporal. Reintentando en 2 seg... (Intentos restantes: ${attempts - 1})`);
      await delay(2000);
      return commitWithRetry(batch, attempts - 1);
    }
    throw error; // Si falla 3 veces, nos rendimos y lanzamos el error.
  }
}

/**
 * Procesa y sube un lote de datos de stock, luego se llama a sí misma para el siguiente
 * lote, creando una cadena recursiva segura para la memoria.
 * @param allData El array completo de datos a subir.
 * @param organizationId El ID de la organización.
 * @param startIndex El índice desde el cual empezar a procesar el siguiente lote.
 */
const BATCH_SIZE = 450; // Antes 50/75. Máxima carga por viaje.
const DELAY_MS = 50;    // Antes 500/1500. Velocidad de crucero.

async function processStockBatch(
  allData: NormalizedRow[], 
  organizationId: string, 
  startIndex: number
): Promise<void> {
  // 1. Condición de salida (Éxito Total)
  if (startIndex >= allData.length) {
    Logger.log("🚀 ¡SUBIDA DE STOCK COMPLETADA EXITOSAMENTE! (100%)");
    await verifyTotalCount(organizationId, allData.length);
    return;
  }

  // 2. Extraer SOLO los datos necesarios para este momento (Slice)
  const end = Math.min(startIndex + BATCH_SIZE, allData.length);
  const currentChunk = allData.slice(startIndex, end);

  // 3. Instanciar Batch (Just-in-Time)
  const batch = writeBatch(db);
  currentChunk.forEach(item => {
    const docId = `${item.tiendaId}_${item.sku}`;
    const docRef = doc(db, `organizations/${organizationId}/stock`, docId);
    batch.set(docRef, item);
  });

  try {
    // 4. Subir y esperar confirmación real, con reintentos automáticos.
    await commitWithRetry(batch);
    const progress = Math.round((end / allData.length) * 100);
    Logger.log(`✅ Progreso Stock: ${progress}% (${end}/${allData.length} docs)`);

    // 5. PAUSA TÁCTICA para que el Event Loop y el GC respiren
    await delay(DELAY_MS);

    // 6. RECURSIVIDAD: Llamada al siguiente lote. La memoria de esta ejecución se libera.
    return processStockBatch(allData, organizationId, end);
  } catch (error) {
    Logger.error("❌ Error crítico en subida de stock en índice " + startIndex, error);
    throw error; // Detener la cadena si un lote falla
  }
}

/**
 * Sube datos de stock a Firestore en lotes.
 * @param data - Array de datos normalizados a subir.
 * @param organizationId - ID de la organización para la estructura de datos SaaS.
 */
export const uploadStockBatch = async (data: NormalizedRow[], organizationId: string): Promise<void> => {
  Logger.log(`Iniciando subida en lotes para la organización: ${organizationId}`);
  // Inicia la cadena recursiva desde el principio del array de datos.
  await processStockBatch(data, organizationId, 0);
};

/**
 * Sube o actualiza el diccionario de productos en Firestore.
 * @param dictionaryItems - Array de items del diccionario a subir.
 */
export const uploadDictionaryBatch = async (dictionaryData: { products: ProductDictionaryItem[], sizes: { code: string, label: string }[] }): Promise<void> => {
  const { products, sizes } = dictionaryData;
  Logger.log(`Iniciando subida de diccionario: ${products.length} productos y ${sizes.length} tallas.`);
  const batchSize = 200; // El diccionario es más pequeño, podemos usar lotes más grandes.
  const uploadPromises = [];
  let productChunksCount = 0;

  // --- Lote 1: Guardar los productos ---
  if (products.length > 0) {
    const productChunks: ProductDictionaryItem[][] = [];
    for (let i = 0; i < products.length; i += batchSize) {
      productChunks.push(products.slice(i, i + batchSize));
    }
    productChunksCount = productChunks.length;

    const uploadProductsPromise = (async () => {
      Logger.log(`Iniciando subida de diccionario en ${productChunksCount} lotes.`);
      for (let i = 0; i < productChunks.length; i++) {
        const chunk = productChunks[i];
        const batch = writeBatch(db);
        chunk.forEach((item) => {
          if (!item.sku) return;
          const docRef = doc(db, 'product_dictionary', item.sku);
          batch.set(docRef, item, { merge: true });
        });
        await commitWithRetry(batch); // Aplicamos reintentos también aquí.
        Logger.log(`✅ Lote de diccionario ${i + 1}/${productChunksCount} guardado.`);
        await delay(DELAY_MS);
      }
    })();
    uploadPromises.push(uploadProductsPromise);
  }

  // --- Lote 2: Guardar el mapa de tallas global ---
  if (sizes.length > 0) {
    // Convertimos el array de tallas a un objeto mapa
    const sizeMapToUpload = sizes.reduce((acc, size) => {
      acc[size.code] = size.label;
      return acc;
    }, {} as { [key: string]: string });

    // Usamos un único documento para el mapa de tallas global
    const configRef = doc(db, 'configuration', 'general');
    const batch = writeBatch(db);
    // Usamos { merge: true } para añadir/actualizar tallas sin borrar las existentes
    batch.set(configRef, { sizeMap: sizeMapToUpload }, { merge: true });
    
    uploadPromises.push(batch.commit());
    Logger.log('Subida de mapa de tallas global.');
  }

  await Promise.all(uploadPromises);
  Logger.log("🏁 Subida de diccionario 100% completada y segura.");
};