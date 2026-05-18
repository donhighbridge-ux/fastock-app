import { db, storage } from '../firebase-config'; // Asegúrate de que 'storage' esté exportado en tu config
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc, 
  limit, }

from 'firebase/firestore';
import type { StoreLayout } from '../types';

/**
 * REGLA DE ORO: Normalización de ID (Slug)
 * Convierte "Viña del Mar" en "vina-del-mar"
 */
export const normalizeStoreId = (name: string): string => {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Elimina acentos y eñes
    .replace(/[^a-z0-9]/g, '-')     // Reemplaza espacios y símbolos por guiones
    .replace(/-+/g, '-')             // Evita guiones dobles
    .replace(/^-|-$/g, '');          // Limpia extremos
};

/**
 * SERVICIO A: Subida de Plano
 */
export const uploadStoreLayout = async (
  file: File, 
  storeName: string, 
  organizationId: string = "demo_org_v1"
): Promise<string> => {
  const storeId = normalizeStoreId(storeName);
  const timestamp = Date.now();
  const fileName = `${storeId}_${timestamp}.svg`;
  const storagePath = `layouts/${organizationId}/${storeId}/${fileName}`;
  
  console.log(`[layoutService] Iniciando subida para: ${storeId}...`);

  try {
    // 1. Subida a Firebase Storage
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    console.log(`[layoutService] Archivo en Storage: ${downloadURL}`);

    // 2. Desactivar planos anteriores de esta tienda (Versioning)
    const layoutsRef = collection(db, 'layouts');
    const q = query(layoutsRef, where('storeId', '==', storeId), where('active', '==', true));
    const querySnapshot = await getDocs(q);
    
    for (const document of querySnapshot.docs) {
      await updateDoc(doc(db, 'layouts', document.id), { active: false });
    }

    // 3. Crear registro en Firestore (La "Constitución")
    const newLayout: Omit<StoreLayout, 'id'> = {
      storeId,
      svgUrl: downloadURL,
      fileName: file.name,
      createdAt: timestamp,
      active: true
    };

    const docRef = await addDoc(layoutsRef, newLayout);
    console.log(`[layoutService] Registro creado con ID: ${docRef.id}`);
    
    return docRef.id;
  } catch (error) {
    console.error("[layoutService] Error en la operación:", error);
    throw error;
  }
};

/**
 * SERVICIO B: Obtener Plano Activo
 */
export const getActiveStoreLayout = async (storeName: string): Promise<StoreLayout | null> => {
  if (!storeName || storeName === 'all') return null;
  
  const storeId = normalizeStoreId(storeName);
  const layoutsRef = collection(db, 'layouts');
  const q = query(
    layoutsRef, 
    where('storeId', '==', storeId), 
    where('active', '==', true),
    limit(1)
  );

  try {
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;

    const data = querySnapshot.docs[0].data();
    return { id: querySnapshot.docs[0].id, ...data } as StoreLayout;
  } catch (error) {
    console.error("[layoutService] Error al recuperar plano:", error);
    return null;
  }
};
