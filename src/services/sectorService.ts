// 💡 NOTA DE FLETCHER: Si tu archivo de Firebase está directamente en src/firebase.ts, cambia la ruta a '../firebase'
import { db } from '../firebase-config'; 
import { collection, addDoc, getDocs, query, where, writeBatch, doc } from 'firebase/firestore';
import type { DrawingLine } from '../hooks/useSectorDrawing'; // ✅ Corregido con 'import type' para verbatimModuleSyntax

const COLLECTION_NAME = 'drawing_lines';

export const sectorService = {
  /**
   * Guarda una línea punteada en Firestore vinculada a una tienda específica
   */
  async saveLine(storeId: string, line: DrawingLine): Promise<void> {
    try {
      const colRef = collection(db, COLLECTION_NAME);
      await addDoc(colRef, {
        id: line.id,
        x1: line.x1,
        y1: line.y1,
        x2: line.x2,
        y2: line.y2,
        storeId: storeId,
        createdAt: Date.now()
      });
      console.log(`[sectorService] Línea ${line.id} persistida en Firestore para la tienda: ${storeId}`);
    } catch (error) {
      console.error(`[sectorService] Error crítico al guardar línea en Firestore:`, error);
      throw error;
    }
  },

  /**
   * Recupera todas las líneas de geometría guardadas para una tienda específica
   */
  async getLines(storeId: string): Promise<DrawingLine[]> {
    try {
      const colRef = collection(db, COLLECTION_NAME);
      const q = query(colRef, where('storeId', '==', storeId));
      const querySnapshot = await getDocs(q);

      const savedLines: DrawingLine[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        savedLines.push({
          id: data.id,
          x1: data.x1,
          y1: data.y1,
          x2: data.x2,
          y2: data.y2
        });
      });

      console.log(`[sectorService] Éxito: ${savedLines.length} líneas vectoriales recuperadas desde la nube para ${storeId}`);
      return savedLines;
    } catch (error) {
      console.error(`[sectorService] Error al recuperar la geometría de la tienda ${storeId}:`, error);
      throw error;
    }
  },

  /**
   * Elimina de golpe todas las líneas de dibujo correspondientes a una tienda
   */
  async clearLines(storeId: string): Promise<void> {
    try {
      const colRef = collection(db, COLLECTION_NAME);
      const q = query(colRef, where('storeId', '==', storeId));
      const querySnapshot = await getDocs(q);

      const batch = writeBatch(db);
      querySnapshot.forEach((docSnap) => {
        batch.delete(doc(db, COLLECTION_NAME, docSnap.id));
      });

      await batch.commit();
      console.log(`[sectorService] Memoria limpia: Toda la geometría de ${storeId} ha sido eliminada de Firestore.`);
    } catch (error) {
      console.error(`[sectorService] Error al ejecutar el borrado por lote en ${storeId}:`, error);
      throw error;
    }
  }
};
