import { getFirestore, writeBatch, doc } from 'firebase/firestore';
import { app } from '../firebase-config';
import Logger from '../utils/logger';

const db = getFirestore(app);

/**
 * SERVICIO DE EDICIÓN UNITARIA
 * Se encarga de actualizar propiedades específicas de un producto en la base de datos
 * sin alterar el resto de su información (categoría, área, etc.).
 */
export const updateProductName = async (sku: string, newName: string): Promise<void> => {
  try {
    // Normalizamos el SKU por seguridad (sin espacios accidentales)
    const safeSku = sku.trim();
    const docRef = doc(db, 'product_dictionary', safeSku);
    
    const batch = writeBatch(db);
    
    // Usamos merge: true para sobreescribir SOLO el campo 'name', respetando el resto del ADN
    batch.set(docRef, { friendlyName: newName }, { merge: true });
    
    await batch.commit();
    Logger.log(`✏️ Nombre actualizado con éxito para SKU ${safeSku}: ${newName}`);
  } catch (error) {
    Logger.error(`❌ Error actualizando nombre para SKU ${sku}:`, error);
    throw error;
  }
};
