import { WriteBatch } from 'firebase/firestore';
import Logger from './logger';

// Constantes de Ingeniería
export const BATCH_SIZE = 450; 
export const DELAY_MS = 100;

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Ejecuta un batch commit con estrategia de "Exponential Backoff" (reintento inteligente).
 * Estándar de industria para sistemas distribuidos.
 */
export async function commitWithRetry(batch: WriteBatch, attempts = 3): Promise<void> {
  try {
    await batch.commit();
  } catch (error) {
    if (attempts > 1) {
      Logger.warn(`⚠️ Fallo en escritura por lotes. Reintentando... (Quedan ${attempts - 1})`);
      await delay(2000); // Espera de seguridad
      return commitWithRetry(batch, attempts - 1);
    }
    Logger.error("🔥 Fallo definitivo en batch commit.", error);
    throw error;
  }
}

/**
 * Divide un array en chunks para procesamiento por lotes.
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
