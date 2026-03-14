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
  await simulateGhostPurge(organizationId, currentSyncStamp);
  await verifyTotalCount(organizationId, data.length);
};

// --- EL EXORCISTA (SIMULACRO) ---
async function simulateGhostPurge(organizationId: string, validStamp: number) {
  Logger.log("👻 Iniciando búsqueda de productos fantasma (SIMULACRO)...");
  try {
    const coll = collection(db, `organizations/${organizationId}/stock`);
    const snapshot = await getDocs(coll);

    let ghostsCount = 0;

    snapshot.forEach((documento) => {
      const data = documento.data();
      
      if (!data.syncStamp || data.syncStamp < validStamp) {
        ghostsCount++;
        
        if (ghostsCount <= 10) {
          console.warn(`🗑️ [SIMULACRO] Se borraría el zombi: ${data.sku} de la tienda ${data.tiendaNombre}`);
        }
      }
    });

    if (ghostsCount > 10) {
      console.warn(`... y ${ghostsCount - 10} zombis más ocultos.`);
    }

    Logger.log(`🧹 SIMULACRO COMPLETADO: Se detectaron ${ghostsCount} productos listos para ser purgados en el futuro.`);
  } catch (error) {
    Logger.error(`❌ Error en la búsqueda de fantasmas: ${error}`);
  }
}
