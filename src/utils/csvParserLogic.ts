import Papa from 'papaparse';
import Logger from './logger'; 
import type { NormalizedRow, ProductDictionaryItem } from '../types';
import { METRIC_MAPPINGS, STATIC_COLUMNS,} from './csvConfig';

// ==========================================
// 🛠️ HELPERS (Limpieza de Datos)
// ==========================================

// Mantiene la lógica para Stock CD (que sigue siendo numérico estricto)
const cleanNumber = (val: unknown): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.-]/g, ''); 
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

// NUEVO: Maneja la lógica "VibeCoded" para métricas variables
// Si es null/vacío -> 'N/A'. Si tiene dato -> Número.
const cleanMetricValue = (val: unknown): number | string => {
  if (val === null || val === undefined || val === '') return 'N/A';
  if (typeof val === 'string' && val.trim() === '') return 'N/A';
  
  return cleanNumber(val);
};

const sanitizeStoreId = (name: string | null | undefined): string => {
  // 1. PRIMERA LÍNEA DE DEFENSA: ¿Es algo real?
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return 'tienda_desconocida'; // Fallback seguro
  }

  // 2. LIMPIEZA QUIRÚRGICA
  const cleaned = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')        // Espacios -> Guiones bajos
    .replace(/[^a-z0-9_]/g, ''); // Eliminar todo lo que no sea letra, número o guión

  // 3. ÚLTIMA LÍNEA DE DEFENSA: ¿Quedó algo después de limpiar?
  return cleaned || 'tienda_sin_nombre';
};

// Esta función estandariza el nombre visual para el Frontend (Mayúsculas)
const sanitizeStoreName = (name: string | null | undefined): string => {
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return 'TIENDA DESCONOCIDA';
  }
  return name.trim().toUpperCase(); 
};

// ✅ INYECCIÓN: Saneador de Temporada (Quita -S y maneja huérfanos)
const sanitizeTemporada = (temp: string | null | undefined): string => {
  if (!temp || typeof temp !== 'string' || temp.trim() === '' || temp.trim().toUpperCase() === 'N/A') {
    return 'Sin Temporada';
  }
  let cleaned = temp.trim().toUpperCase();
  if (cleaned.endsWith('-S')) {
    cleaned = cleaned.slice(0, -2); // Amputa el '-S' táctico
  }
  return cleaned;
};

// --- PARSER PRINCIPAL ---

export const parseAndNormalizeCsv = (csvText: string): Promise<NormalizedRow[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: false,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        try {
          const rawData = results.data as string[][];
          
          // VALIDACIÓN DE ESTRUCTURA MÍNIMA (5 Filas)
          // Fila 0: Tiendas | Fila 1: Códigos | Fila 2: Headers | Fila 3: Relleno | Fila 4: Datos
          if (!rawData || rawData.length < 5) {
            throw new Error("El archivo no cumple con la estructura mínima requerida (5 filas de contexto).");
          }

          Logger.log(`📊 Iniciando análisis VibeCoded. Filas totales: ${rawData.length}`);

          // --- FASE 1: MAPEO DEL TERRITORIO (Filas 0, 1 y 2) ---
          
          const rowTiendas = rawData[0]; // Fila 1 Excel (Index 0)
          const rowCodigos = rawData[1]; // Fila 2 Excel (Index 1)
          const rowHeaders = rawData[2]; // Fila 3 Excel (Index 2) - Headers Reales

          // A. Detectar Bloques de Tiendas (Barrido Horizontal en Fila 0)
          const stores: { name: string; code: string; start: number; end: number }[] = [];
          let currentStoreStart = -1;
          let currentStoreName = "";

          for (let i = 0; i < rowTiendas.length; i++) {
            const cell = rowTiendas[i]?.trim();
            
            // Si hay texto y es largo -> Nueva Tienda
            if (cell && cell.length > 2) {
              // Cerrar tienda anterior si existe
              if (currentStoreStart !== -1) {
                stores.push({ 
                  name: currentStoreName, 
                  // Capturamos el código de tienda de la Fila 1
                  code: rowCodigos[currentStoreStart]?.trim() || 'S/C',
                  start: currentStoreStart, 
                  end: i - 1 
                });
              }
              // Abrir nueva tienda
              currentStoreStart = i;
              currentStoreName = cell;
            }
          }
          // Cerrar la última tienda pendiente
          if (currentStoreStart !== -1) {
            stores.push({ 
              name: currentStoreName, 
              code: rowCodigos[currentStoreStart]?.trim() || 'S/C',
              start: currentStoreStart, 
              end: rowTiendas.length - 1 
            });
          }

          if (stores.length === 0) throw new Error("No se detectaron tiendas en la Fila 1.");
          Logger.log(`🏢 Tiendas detectadas: ${stores.length}`);

          // B. Buscar Índices de Columnas Globales (Barrido Horizontal en Fila 2)
          // Buscamos dónde están SKU, Descripción, Stock CD, etc.
          const findIndex = (aliases: string[]) => rowHeaders.findIndex(cell => 
            cell && aliases.some(alias => cell.trim().toLowerCase() === alias.toLowerCase())
          );

          const idxSku = findIndex(STATIC_COLUMNS.sku);
          const idxDesc = findIndex(STATIC_COLUMNS.description);
          const idxStockCD = findIndex(STATIC_COLUMNS.stock_cd); // Global
          
          // Propiedades Constantes
          const idxArea = findIndex(STATIC_COLUMNS.area);
          const idxCategoria = findIndex(STATIC_COLUMNS.categoria);
          const idxTemporada = findIndex(STATIC_COLUMNS.temporada);
          const idxMarca = findIndex(STATIC_COLUMNS.marca); // Usamos Temporada/Marca

          if (idxSku === -1) throw new Error("⛔ Estructura Inválida: No se encontró la columna 'SKU' en la Fila 3.");

          // --- FASE 2: EXTRACCIÓN DE DATOS (Fila 4 en adelante) ---

          const normalizedData: NormalizedRow[] = [];
          const startRowIndex = 4; // Fila 5 del Excel (Index 4) - Saltamos la Fila 3 (Relleno)

          for (let i = startRowIndex; i < rawData.length; i++) {
            const row = rawData[i];
            const skuVal = row[idxSku];
            if (!skuVal) continue; // Validación mínima de existencia

            const sku = skuVal.trim();

            // Validación: Si no hay SKU, la fila no sirve
            if (sku.split('_').length !== 3) continue;

            const description = idxDesc !== -1 ? row[idxDesc] : 'Sin Descripción';
            // Extracción Global: Stock CD se toma una vez por fila
            const stockCd = idxStockCD !== -1 ? cleanNumber(row[idxStockCD]) : 0;
            
            // Extracción de Constantes 
            const area = idxArea !== -1 ? row[idxArea]?.trim() : 'General';
            const categoria = idxCategoria !== -1 ? row[idxCategoria]?.trim() : 'General';
            const temporada = idxTemporada !== -1 ? sanitizeTemporada(row[idxTemporada]) : 'Sin Temporada';
            const marca = idxMarca !== -1 ? row[idxMarca]?.trim() : 'General'; // Mapeo de Temporada

            // Generación de Filas Atómicas (Una por Tienda)
            stores.forEach(store => {
              const safeId = sanitizeStoreId(store.name);
              const safeName = sanitizeStoreName(store.name);

              const normalizedRow: NormalizedRow = {
                sku: sku,
                description: description,
                tiendaId: safeId,
                tiendaNombre: safeName,
                
                // Propiedades Constantes 
                marca: marca,
                categoria: categoria,
                area: area,
                temporada: temporada,

                // Valores iniciales variables en 0
                stock: 0, 
                transit: 0, 
                sales2w: 0, 
                ra: 0, 
                
                // Asignamos el dato global
                stock_cd: stockCd 
              };

              // Extracción Local: Buscamos métricas DENTRO del rango de columnas de esta tienda
              METRIC_MAPPINGS.forEach(mapping => {
                // Solo buscamos entre start y end de ESTA tienda
                for (let col = store.start; col <= store.end; col++) {
                  const headerName = rowHeaders[col];
                  if (headerName && mapping.aliases.some(alias => headerName.trim() === alias)) {
                    // Mapeo seguro usando csvConfig
                    const val = cleanMetricValue(row[col]);
                    // TypeScript safe casting
                    (normalizedRow as unknown as Record<string, string | number>)[mapping.targetField] = val;
                    break; // Dato encontrado, pasar a la siguiente métrica
                  }
                }
              });

              normalizedData.push(normalizedRow);
            });
          }

          Logger.log(`✅ Parser finalizado. ${normalizedData.length} registros generados.`);
          resolve(normalizedData);

        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : "Error desconocido durante el parsing";
          Logger.error("Error Parser:", msg);
          reject(new Error(msg));
        }
      }
    });
  });
};

// --- STUB DICCIONARIO (Corrección de unused var) ---

// Eliminamos el argumento o usamos _ para indicar desuso
export const parseDictionaryCsv = (): Promise<{ products: ProductDictionaryItem[], sizes: unknown[] }> => {
  return new Promise((resolve) => {
    Logger.log("⚠️ Parseo diccionario pendiente de refactor.");
    resolve({ products: [], sizes: [] });
  });
};
