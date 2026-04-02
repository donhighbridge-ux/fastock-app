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
    console.log('🚨 SEÑAL DE BOTÓN RECIBIDA: Iniciando scanRA...'); // <--- INYECTA ESTO
    if (!currentStore || currentStore === 'all' || currentStore === 'Todas las Tiendas') {
      setRaFeedback('⚠️ Selecciona una tienda específica para auditar la RA.');
      setTimeout(() => setRaFeedback(null), 3000);
      return;
    }

    setIsScanningRA(true);
    setRaFeedback('Buscando leyes de RA en la nube...');

    try {
      // 1. Obtener leyes de Firebase
      const docRef = doc(db, 'config', `ra_thresholds_${currentStore}`);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        setRaFeedback('⚠️ No hay leyes de RA configuradas. Ve al Centro de Comando.');
        setIsScanningRA(false);
        setTimeout(() => setRaFeedback(null), 4000);
        return;
      }

      const thresholds = docSnap.data() as Record<string, number | null>;
      console.log('🚨 LEYES DESCARGADAS DE FIREBASE:', thresholds);

      // 2. Limitar escaneo a la tienda actual
      const targetData = data.filter(row => row.tiendaNombre === currentStore || row.tiendaId === currentStore);

      // ------------------------------------------------------------------
      // 🟢 PASADA 1: EL RADAR DE DISPONIBILIDAD (Salud de la Curva)
      // ------------------------------------------------------------------
      const availabilityRadar = new Map<string, {
        totalSizes: number;
        physicallyAliveSizes: number;
      }>();

      targetData.forEach(row => {
        const parts = row.sku.split('_');
        const baseSkuOriginal = parts.length >= 2 ? parts.slice(0, 2).join('_') : row.sku;
        const baseSkuLower = baseSkuOriginal.toLowerCase();

        const stock = Number(row.stock) || 0;
        const cd = Number(row.stock_cd) || 0;
        const transit = Number(row.transit) || 0;

        if (!availabilityRadar.has(baseSkuLower)) {
          availabilityRadar.set(baseSkuLower, { totalSizes: 0, physicallyAliveSizes: 0 });
        }

        const radar = availabilityRadar.get(baseSkuLower)!;
        radar.totalSizes += 1;

        // Si la talla tiene presencia física en alguna parte, está "viva"
        if ((stock + cd + transit) > 0) {
          radar.physicallyAliveSizes += 1;
        }
      });

      // ------------------------------------------------------------------
      // 🟢 PASADA 2: EL TRIBUNAL DEL 80% Y AUDITORÍA DE LEYES
      // ------------------------------------------------------------------
      const proposals = new Map<string, {
        area: string;
        description: string;
        proposedRaMap: Record<string, number>;
      }>();

      targetData.forEach(row => {
        const parts = row.sku.split('_');
        const baseSkuOriginal = parts.length >= 2 ? parts.slice(0, 2).join('_') : row.sku;
        const baseSkuLower = baseSkuOriginal.toLowerCase();
        const size = parts.length > 2 ? parts.slice(2).join('_') : 'Única';

        const radar = availabilityRadar.get(baseSkuLower);

        // 🚨 SUERO DE LA VERDAD (Micrófono en la entrada)
        if (baseSkuOriginal === 'INGRESA_AQUÍ_EL_SKU_DEL_JEAN') { 
          // Fabricamos copias locales solo para el log, sin tocar tus variables reales de más abajo
          const areaLog = row.area?.trim().toUpperCase() || 'SIN ÁREA';
          const catLog = row.categoria?.trim().toUpperCase() || 'SIN CATEGORÍA';
          
          console.log('🚨 TALLA EN REVISIÓN:', size);
          console.log('1. Salud en Radar:', radar);
          console.log('2. RA en Excel (Crudo):', row.ra);
          console.log('3. Inventario Físico -> Tienda:', row.stock, '| CD:', row.stock_cd, '| Tránsito:', row.transit);
          console.log('4. Llave que buscará en DB:', `${areaLog}::${catLog}`);
          console.log('------------------------------------------------');
        }

        // 🛡️ REGLA MAESTRA DEL 80%: ¿La cadena tiene inventario para respaldar esto?
        if (radar && radar.totalSizes > 0) {
          const healthRatio = radar.physicallyAliveSizes / radar.totalSizes;
          if (healthRatio < 0.6) {
            return; // Abortar: La curva está rota a nivel cadena. No se piden alzas de RA.
          }
        }

        // Sanitización militar del RA actual
        const rawRa = Number(row.ra);
        const safeRa = isNaN(rawRa) ? 0 : rawRa;
        
        // 🛡️ REGLA: Ignorar RA 0 o no asignada
        if (safeRa <= 0) return;

        const stock = Number(row.stock) || 0;
        const cd = Number(row.stock_cd) || 0;
        const transit = Number(row.transit) || 0;
        const sales = Number(row.sales2w) || 0;

        // 🛡️ FILTRO ANTI-ZOMBIES: Detección de cadáveres digitales que pasaron por algún hueco
        const isZombie = safeRa >= 1 && cd === 0 && stock === 0 && transit === 0 && sales === 0;
        if (isZombie) return;

        // Construir la llave para buscar la ley
        const area = row.area?.trim().toUpperCase() || 'SIN ÁREA';
        const cat = row.categoria?.trim().toUpperCase() || 'SIN CATEGORÍA';
        const thresholdKey = `${area}_${cat}`;
        const threshold = thresholds[thresholdKey];

        // 🛡️ TRIBUNAL FINAL: Evaluar contra la ley
        if (threshold === undefined || threshold === null) return; // No hay ley, se ignora (NCA)

        if (safeRa < threshold) {
          if (!proposals.has(baseSkuOriginal)) {
            proposals.set(baseSkuOriginal, {
              area: row.area || 'General',
              description: productDictionary[baseSkuLower] || row.description,
              proposedRaMap: {}
            });
          }
          // Anotar la nueva RA propuesta para esta talla exacta
          proposals.get(baseSkuOriginal)!.proposedRaMap[size] = threshold;
        }
      });

      // ------------------------------------------------------------------
      // 🟢 EMPAQUETADO FINAL
      // ------------------------------------------------------------------
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
           proposedRaMap: details.proposedRaMap 
         });
         itemsAdded++;
      });

      if (itemsAdded > 0) {
        setRaFeedback(`🟣 ¡Auditoría Completa! Se encontraron ${itemsAdded} modelos sanos con RA deficiente.`);
      } else {
        setRaFeedback('✅ La tienda cumple las leyes o el stock restante no justifica el alza.');
      }

    } catch (error) {
      console.error("Error en auditoría RA:", error);
      setRaFeedback('❌ Error de conexión al evaluar RA.');
    } finally {
      setIsScanningRA(false);
      setTimeout(() => setRaFeedback(null), 4000);
    }
  };

  return { scanRA, isScanningRA, raFeedback };
};
