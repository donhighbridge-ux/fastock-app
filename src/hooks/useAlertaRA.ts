import { useState } from 'react';
import { useCart } from '../context/useCart';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase-config';
import type { NormalizedRow } from '../types';

export const useAlertaRA = (
  data: NormalizedRow[], 
  currentStore: string | null, 
  productDictionary: Record<string, string>
) => {
  const { addToRequest } = useCart();
  const [raFeedback, setRaFeedback] = useState<string | null>(null);
  const [isScanningRA, setIsScanningRA] = useState(false);

  const scanRA = async () => {
    if (!currentStore || currentStore === 'all' || currentStore === 'Todas las Tiendas') {
      setRaFeedback('⚠️ Selecciona una tienda específica para auditar la RA.');
      setTimeout(() => setRaFeedback(null), 3000);
      return;
    }

    setIsScanningRA(true);
    setRaFeedback('Buscando leyes de RA en la nube...');

    try {
      // 1. Obtener leyes de Firebase
      const docRef = doc(db, 'config', 'ra_thresholds');
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        setRaFeedback('⚠️ No hay leyes de RA configuradas. Ve al Centro de Comando.');
        setIsScanningRA(false);
        setTimeout(() => setRaFeedback(null), 4000);
        return;
      }

      const thresholds = docSnap.data() as Record<string, number | null>;
      
      // 2. Aislar datos de la tienda objetivo
      const targetData = data.filter(row => row.tiendaNombre === currentStore || row.tiendaId === currentStore);

      // 3. Memoria de propuestas: Map<baseSku, { area, description, proposedRaMap: Record<size, number> }>
      const proposals = new Map<string, { area: string, description: string, proposedRaMap: Record<string, number> }>();

      targetData.forEach(row => {
        // Sanitización militar del RA actual
        const safeRa = (row.ra === 'N/A' || row.ra === '' || row.ra == null || row.ra === 'NaN') ? 0 : Number(row.ra) || 0;
        
        // 🛡️ REGLA: Ignorar RA 0 o no asignada
        if (safeRa <= 0) return;

        // 🛡️ FILTRO ANTI-ZOMBIES: Detección de cadáveres digitales
        const stock = Number(row.stock) || 0;
        const cd = Number(row.stock_cd) || 0;
        const transit = Number(row.transit) || 0;
        const sales = Number(row.sales2w) || 0;

        const isZombie = safeRa >= 1 && cd === 0 && stock === 0 && transit === 0 && sales === 0;

        if (isZombie) return; // Abortamos: El producto es un remanente inactivo

        // Construir la llave para buscar la ley
        const area = row.area?.trim().toUpperCase() || 'SIN ÁREA';
        const cat = row.categoria?.trim().toUpperCase() || 'SIN CATEGORÍA';
        const ruleKey = `${area}_${cat}`;
        
        const threshold = thresholds[ruleKey];
        
        // 🛡️ REGLA: Ignorar si es NCA (null) o si la RA actual ya es mayor o igual al umbral (Solo hacia arriba)
        if (!threshold || safeRa >= threshold) return;

        // Extraer estructura del SKU
        const parts = row.sku.split('_');
        const baseSkuOriginal = parts.length >= 2 ? parts.slice(0, 2).join('_') : row.sku;
        const baseSkuLower = baseSkuOriginal.toLowerCase();
        const size = parts.length > 2 ? parts.slice(2).join('_') : 'Única';

        // Inicializar la caja de propuesta si no existe
        if (!proposals.has(baseSkuOriginal)) {
          proposals.set(baseSkuOriginal, {
            area: row.area || 'General',
            description: productDictionary[baseSkuLower] || row.description,
            proposedRaMap: {}
          });
        }

        // Anotar la nueva RA propuesta para esta talla exacta
        proposals.get(baseSkuOriginal)!.proposedRaMap[size] = threshold;
      });

      // 4. Empacar y despachar al Carrito
      let itemsAdded = 0;
      proposals.forEach((details, baseSku) => {
         addToRequest({
           sku: baseSku,
           sizes: Object.keys(details.proposedRaMap), // Solo las tallas que fallaron la auditoría
           area: details.area,
           description: details.description,
           timestamp: Date.now(),
           originStore: currentStore,
           requestType: 'ra', // 🟢 Etiqueta vital para que la UI lo pinte morado
           proposedRaMap: details.proposedRaMap // El mapa de incrementos
         });
         itemsAdded++;
      });

      if (itemsAdded > 0) {
        setRaFeedback(`🟣 ¡Auditoría Completa! Se encontraron ${itemsAdded} modelos con RA deficiente.`);
      } else {
        setRaFeedback('✅ La tienda cumple con todas las leyes de RA vigentes.');
      }

    } catch (error) {
      console.error("Error en auditoría RA:", error);
      setRaFeedback('❌ Error de conexión al evaluar RA.');
    }

    setIsScanningRA(false);
    setTimeout(() => setRaFeedback(null), 4000);
  };

  return { scanRA, raFeedback, isScanningRA };
};
