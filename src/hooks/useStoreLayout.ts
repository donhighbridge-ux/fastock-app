import { useState, useEffect } from 'react';
import { getActiveStoreLayout } from '../services/layoutService';
import type { StoreLayout } from '../types';

/**
 * HOOK: useStoreLayout
 * Escucha los cambios en la tienda seleccionada y recupera el plano activo.
 */
export const useStoreLayout = (storeName: string | null | undefined) => {
  const [layout, setLayout] = useState<StoreLayout | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLayout = async () => {
      // 1. Validaciones previas
      if (!storeName || storeName === 'all' || storeName === 'Todas las Tiendas') {
        setLayout(null);
        setError(null);
        return;
      }

      console.log(`[useStoreLayout] Detectado cambio de tienda: ${storeName}. Buscando plano...`);
      setLoading(true);
      setError(null);

      try {
        // 2. Llamada al Músculo (Service)
        const activeLayout = await getActiveStoreLayout(storeName);
        
        if (activeLayout) {
          console.log(`[useStoreLayout] Plano encontrado para ${storeName}:`, activeLayout.fileName);
          setLayout(activeLayout);
        } else {
          console.log(`[useStoreLayout] No se encontró plano activo para: ${storeName}`);
          setLayout(null);
        }
      } catch (err) {
        console.error(`[useStoreLayout] Error crítico:`, err);
        setError("No se pudo cargar el mapa de la tienda.");
      } finally {
        setLoading(false);
      }
    };

    fetchLayout();
  }, [storeName]); // Se dispara cada vez que cambia la tienda

  return { layout, loading, error };
};
