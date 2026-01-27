import { getFirestore, writeBatch, doc, getCountFromServer, collection } from 'firebase/firestore';
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
  chunkIndex: number
): Promise<void> {
  if (chunkIndex >= dataChunks.length) return;

  const currentChunk = dataChunks[chunkIndex];
  const batch = writeBatch(db);

  currentChunk.forEach(item => {
    // ID Determinista: Tienda + SKU
    const docId = `${item.tiendaId}_${item.sku}`; 
    const docRef = doc(db, `organizations/${organizationId}/stock`, docId).withConverter(stockConverter);
    batch.set(docRef, item);
  });

  await commitWithRetry(batch);
  
  const progress = Math.round(((chunkIndex + 1) / dataChunks.length) * 100);
  Logger.log(`📦 Stock Lote ${chunkIndex + 1}/${dataChunks.length} subido (${progress}%)`);

  await delay(DELAY_MS);
  return processStockUpload(dataChunks, organizationId, chunkIndex + 1);
}

// --- PUBLIC API ---
export const uploadStockBatch = async (data: NormalizedRow[], organizationId: string): Promise<void> => {
  if (!organizationId) throw new Error("ID de organización requerido.");
  
  Logger.log(`🚀 Iniciando carga de STOCK: ${data.length} registros.`);
  const chunks = chunkArray(data, BATCH_SIZE);
  await processStockUpload(chunks, organizationId, 0);
  await verifyTotalCount(organizationId, data.length);
};
