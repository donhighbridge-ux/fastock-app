// 💡 NOTA DE FLETCHER: Si tu archivo de Firebase está directamente en src/firebase.ts, cambia la ruta a '../firebase'
import { db } from '../firebase-config'; 
import { collection, addDoc, getDocs, query, where, writeBatch, doc } from 'firebase/firestore';
import type { StoreSector } from '../types';

const COLLECTION_NAME = 'store_sectors'; // 🚀 Nueva colección limpia en la nube

export const sectorService = {
  /**
   * Guarda un polígono cerrado (Sector) en Firestore
   */
  async saveSector(storeId: string, sector: StoreSector): Promise<void> {
    try {
      const colRef = collection(db, COLLECTION_NAME);
      await addDoc(colRef, {
        id: sector.id,
        points: sector.points,
        color: sector.color || '#a855f7',
        storeId: storeId,
        createdAt: Date.now()
      });
      console.log(`[sectorService] Sector ${sector.id} persistido en Firestore para la tienda: ${storeId}`);
    } catch (error) {
      console.error(`[sectorService] Error crítico al guardar sector en Firestore:`, error);
      throw error;
    }
  },

  /**
   * Recupera todos los sectores guardados para una tienda específica
   */
  async getSectors(storeId: string): Promise<StoreSector[]> {
    try {
      const colRef = collection(db, COLLECTION_NAME);
      const q = query(colRef, where('storeId', '==', storeId));
      const querySnapshot = await getDocs(q);

      const savedSectors: StoreSector[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        savedSectors.push({
          id: data.id,
          points: data.points || [],
          color: data.color
        });
      });

      console.log(`[sectorService] Éxito: ${savedSectors.length} sectores recuperados desde la nube para ${storeId}`);
      return savedSectors;
    } catch (error) {
      console.error(`[sectorService] Error al recuperar los sectores de la tienda ${storeId}:`, error);
      throw error;
    }
  },

  /**
   * Elimina de golpe todos los sectores correspondientes a una tienda
   */
  async clearSectors(storeId: string): Promise<void> {
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
