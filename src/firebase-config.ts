import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Tu configuración de Firebase para esta aplicación web.
// Es crucial que las variables de entorno en el archivo .env comiencen con "VITE_".
const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID
};

// El log de depuración se ha eliminado para mantener la consola limpia y las credenciales seguras.
// console.log('Firebase Config Loaded:', firebaseConfig);

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Obtener instancias de los servicios que necesitas
const db = getFirestore(app);
const auth = getAuth(app);

// Exportar las instancias para usarlas en otras partes de la aplicación
export { app, db, auth };
export const storage = getStorage(app);
