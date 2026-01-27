import Papa from 'papaparse';
import Logger from './logger'; 
import type { NormalizedRow, ProductDictionaryItem } from '../types';
import { METRIC_MAPPINGS, STORE_BLACKLIST } from './csvConfig';

// Definimos interfaces locales aquí para asegurar que TS las vea
interface StoreRange { 
  name: string; 
  startIndex: number; 
  endIndex: number; 
}

interface CurrentStoreState {
  name: string;
  start: number;
}

// --- HELPERS (Limpieza) ---

const cleanNumber = (val: unknown): number => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.-]/g, ''); 
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
};

const normalizeStr = (str: string): string => 
  (str || '').toLowerCase().trim().replace(/_/g, ' ');

// --- PARSER PRINCIPAL ---

export const parseAndNormalizeCsv = (csvText: string): Promise<NormalizedRow[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rawData = results.data as string[][];
          if (!rawData || rawData.length < 3) throw new Error("Archivo CSV estructura inválida.");

          Logger.log("Iniciando análisis estructural...");

          // 1. Detección de Cabeceras
          const headerRow0 = rawData[0].map(normalizeStr);
          const headerRow1 = rawData[1].map(normalizeStr);

          // 2. Mapeo de Tiendas (Tipado Estricto para evitar 'never')
          const storeMap: StoreRange[] = []; // <--- TIPADO EXPLÍCITO AQUÍ ES CRÍTICO
          let currentStore: CurrentStoreState | null = null; // <--- TIPADO EXPLÍCITO AQUÍ

          // En lugar de .forEach, usamos for clásico.
// Esto mantiene el contexto y hace feliz al compilador paranoico.

for (let index = 0; index < headerRow0.length; index++) {
  const cell = headerRow0[index];
  const isPotentialStore = cell && cell.length > 2 && !STORE_BLACKLIST.some(b => cell.includes(b));

  if (isPotentialStore) {
    if (currentStore) {
      storeMap.push({ 
        name: currentStore.name, 
        startIndex: currentStore.start, 
        endIndex: index - 1 
      });
    }
    // TypeScript confía en esto porque no hay cambio de función
    currentStore = { name: cell, start: index };
  }
}
          
          // Cerrar la última
          if (currentStore) {
             storeMap.push({ 
               name: currentStore.name, 
               startIndex: currentStore.start, 
               endIndex: headerRow0.length - 1 
             });
          }

          if (storeMap.length === 0) throw new Error("No se detectaron tiendas.");

          // 3. Extracción
          const normalizedData: NormalizedRow[] = [];
          
          for (let i = 2; i < rawData.length; i++) {
            const row = rawData[i];
            const sku = row[0]?.trim();
            if (!sku) continue; 

            const baseProduct = {
              sku: sku,
              description: row[1]?.trim() || 'Sin Descripción',
              marca: '', categoria: '', area: '' 
            };

            storeMap.forEach(store => {
              const normalizedRow: NormalizedRow = {
                ...baseProduct,
                tiendaId: store.name.replace(/[^a-z0-9]/g, '_'),
                tiendaNombre: store.name.toUpperCase(),
                stock: 0, transit: 0, stock_cd: 0, sales2w: 0, ra: 0
              };

              let hasData = false;

              METRIC_MAPPINGS.forEach(mapping => {
                for (let col = store.startIndex; col <= store.endIndex; col++) {
                   const headerName = headerRow1[col];
                   if (mapping.aliases.some(alias => headerName.includes(alias))) {
                     const val = cleanNumber(row[col]);
                     normalizedRow[mapping.targetField] = val;
                     if (val !== 0) hasData = true;
                     break; 
                   }
                }
              });

              if (hasData) normalizedData.push(normalizedRow);
            });
          }

          resolve(normalizedData);
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : "Error desconocido";
          Logger.error("Parser Error:", msg);
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
