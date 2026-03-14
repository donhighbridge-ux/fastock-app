import { getFirestore, writeBatch, doc, getCountFromServer, collection, getDocs } from 'firebase/firestore';
import { app } from '../firebase-config';
import type { NormalizedRow } from '../types';
import { stockConverter } from './stockConverters';
import { commitWithRetry, delay, BATCH_SIZE, DELAY_MS, chunkArray } from '../utils/firestoreUtils';
import Logger from '../utils/logger';

const db = getFirestore(app);

// --- AUDITORÍA ---
async function verifyTotalCount(organizationId: string, expectedCount: number) {
  Logger.log("🕵️ Iniciando auditoría forense de datos...");
  const coll = collection(db, `organizations/${organizationId}/stock`);
  const snapshot = await getCountFromServer(coll);
  const total = snapshot.data().count;

  if (total === expectedCount) {
    Logger.log(`✅ INTEGRIDAD VERIFICADA: ${total} documentos exactos.`);
  } else {
    Logger.error(`🚨 DISCREPANCIA: Se esperaban ${expectedCount}, hay ${total}.`);
  }
}

// --- SUBIDA RECURSIVA ---
async function processStockUpload(
  dataChunks: NormalizedRow[][], 
  organizationId: string, 
  chunkIndex: number,
  syncStamp: number
): Promise<void> {
  if (chunkIndex >= dataChunks.length) return;

  const currentChunk = dataChunks[chunkIndex];
  const batch = writeBatch(db);

  currentChunk.forEach(item => {
    // ID Determinista: Tienda + SKU
    const docId = `${item.tiendaId}_${item.sku}`; 
    const docRef = doc(db, `organizations/${organizationId}/stock`, docId).withConverter(stockConverter);
    
    const itemWithStamp: NormalizedRow = {
      ...item,
      syncStamp: syncStamp
    };
    
    batch.set(docRef, itemWithStamp, { merge: true });
  });

  await commitWithRetry(batch);
  
  const progress = Math.round(((chunkIndex + 1) / dataChunks.length) * 100);
  Logger.log(`📦 Stock Lote ${chunkIndex + 1}/${dataChunks.length} subido (${progress}%)`);

  await delay(DELAY_MS);
  return processStockUpload(dataChunks, organizationId, chunkIndex + 1, syncStamp);
}

// --- PUBLIC API ---
export const uploadStockBatch = async (data: NormalizedRow[], organizationId: string): Promise<void> => {
  if (!organizationId) throw new Error("ID de organización requerido.");

  const currentSyncStamp = Date.now();
  
  Logger.log(`🚀 Iniciando carga de STOCK: ${data.length} registros. (Sello temporal: ${currentSyncStamp})`);
  const chunks = chunkArray(data, BATCH_SIZE);
  await processStockUpload(chunks, organizationId, 0, currentSyncStamp);
  await purgeGhostRecords(organizationId, currentSyncStamp);
  await verifyTotalCount(organizationId, data.length);
};

// --- EL EXORCISTA (BORRADO DEFINITIVO) ---
async function purgeGhostRecords(organizationId: string, validStamp: number) {
  Logger.log("👻 Iniciando búsqueda y eliminación de productos fantasma...");
  try {
    const coll = collection(db, `organizations/${organizationId}/stock`);
    const snapshot = await getDocs(coll);

    // 1. Recolección: Metemos las referencias a borrar en una "bolsa de basura"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ghostsToDelete: any[] = [];

    snapshot.forEach((documento) => {
      const data = documento.data();
      if (!data.syncStamp || data.syncStamp < validStamp) {
        ghostsToDelete.push(documento.ref);
      }
    });

    if (ghostsToDelete.length === 0) {
      Logger.log("✨ Base de datos limpia. No se encontraron fantasmas.");
      return;
    }

    Logger.log(`🗑️ Se encontraron ${ghostsToDelete.length} fantasmas. Iniciando purga en bloques...`);

    // 2. Empaquetado: Dividimos en bloques usando tu propia herramienta chunkArray
    const chunks = chunkArray(ghostsToDelete, BATCH_SIZE);

    // 3. Destrucción Secuencial
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const deleteBatch = writeBatch(db);
      
      chunk.forEach((docRef) => {
        deleteBatch.delete(docRef);
      });
      
      await commitWithRetry(deleteBatch);
      Logger.log(`🧹 Purga: Bloque ${i + 1}/${chunks.length} eliminado.`);
    }

    Logger.log(`✅ EXORCISMO COMPLETADO: ${ghostsToDelete.length} productos eliminados definitivamente.`);
  } catch (error) {
    Logger.error(`❌ Error durante el exorcismo: ${error}`);
  }
}

