/**
 * src/utils/csvParserLogic.ts
 * EL MOTOR DE INGESTA.
 * Responsabilidad Única: Convertir texto CSV crudo en NormalizedRow[] válido.
 * No toma decisiones de negocio. Solo normaliza.
 */

import Papa from 'papaparse';
import Logger from './logger'; // Asumo que tienes esto, si no usa console
import type { NormalizedRow, ProductDictionaryItem } from '../types';
import { METRIC_MAPPINGS, STORE_BLACKLIST, MetricKey } from './csvConfig';

// --- HELPERS PUROS (Nivel 1: Limpieza) ---

const cleanNumber = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val || typeof val !== 'string') return 0;
  const num = parseFloat(val.replace(/,/g, '').trim());
  return isNaN(num) ? 0 : num;
};

const normalizeStr = (str: string): string => 
  (str || '').toLowerCase().trim().replace(/_/g, ' ');

// --- MOTOR PRINCIPAL ---

export const parseAndNormalizeCsv = (csvText: string): Promise<NormalizedRow[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: false, // Leemos como matriz primero para detectar la estructura
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rawData = results.data as string[][];
          if (rawData.length < 2) throw new Error("El archivo está vacío o incompleto.");

          // 1. DETECCIÓN DE ESTRUCTURA
          // Asumimos Fila 0: Nombres de Tiendas
          // Asumimos Fila 1: Nombres de Métricas (Stock, Tránsito, etc.)
          const headerRow0 = rawData[0].map(normalizeStr);
          const headerRow1 = rawData[1].map(normalizeStr);

          // 2. MAPEO DE TIENDAS
          // Identificamos dónde empieza cada tienda y su rango de columnas
          const storeMap: Array<{ name: string, startIndex: number, endIndex: number }> = [];
          
          let currentStore: { name: string, start: number } | null = null;

          headerRow0.forEach((cell, index) => {
            if (cell && !STORE_BLACKLIST.some(b => cell.includes(b))) {
              // Encontramos una nueva tienda potencial
              if (currentStore) {
                // Cerramos la anterior
                storeMap.push({ 
                  name: currentStore.name, 
                  startIndex: currentStore.start, 
                  endIndex: index - 1 
                });
              }
              currentStore = { name: cell, start: index };
            }
          });
          // Cerrar la última tienda
          if (currentStore) {
             storeMap.push({ 
               name: currentStore.name, 
               startIndex: currentStore.start, 
               endIndex: headerRow0.length - 1 
             });
          }

          Logger.log(`🏢 Tiendas detectadas: ${storeMap.length}`);

          // 3. EXTRACCIÓN DE DATOS
          const normalizedData: NormalizedRow[] = [];
          
          // Iteramos desde la fila 2 (datos reales)
          for (let i = 2; i < rawData.length; i++) {
            const row = rawData[i];
            // Asumimos col 0 es SKU, col 1 es Descripción (Ajustar según tu Excel real si es distinto)
            // Si SKU está vacío, saltamos
            if (!row[0]) continue; 

            const baseProduct = {
              sku: row[0].trim(),
              description: row[1]?.trim() || 'Sin Descripción',
              marca: '', // Llenar si existe columna
              categoria: '', // Llenar si existe columna
              area: '' // Llenar si existe columna
            };

            // Para cada tienda detectada, extraemos sus métricas
            storeMap.forEach(store => {
              // Crear el objeto fila base
              const normalizedRow: NormalizedRow = {
                ...baseProduct,
                tiendaId: store.name.replace(/\s+/g, '_').toLowerCase(), // ID generado simple
                tiendaNombre: store.name.toUpperCase(),
                stock: 0,
                transit: 0,
                stock_cd: 0,
                sales2w: 0,
                ra: 0
              };

              // Escáner Multiespectral: Buscamos cada métrica dentro del rango de la tienda
              let hasData = false;

              METRIC_MAPPINGS.forEach(mapping => {
                // Buscamos en la fila de cabecera 1, DENTRO del rango de esta tienda
                for (let col = store.startIndex; col <= store.endIndex; col++) {
                   const headerMetricName = headerRow1[col];
                   // ¿Coincide este encabezado con alguno de los alias? (ej: "tránsito" == "transit")
                   if (mapping.aliases.some(alias => headerMetricName.includes(alias))) {
                     const val = cleanNumber(row[col]);
                     normalizedRow[mapping.targetField] = val;
                     if (val > 0) hasData = true;
                     break; // Encontramos la columna para esta métrica, dejamos de buscar
                   }
                }
              });

              // Solo guardamos si hay ALGÚN dato relevante (evitar millones de filas de ceros)
              // OJO: Si quieres guardar ceros explícitos para borrar stock anterior, quita el if(hasData).
              // Para Palantir, a veces el 0 es información. Tú decides. Por ahora filtramos para optimizar.
              if (hasData) {
                normalizedData.push(normalizedRow);
              }
            });
          }

          Logger.log(`✅ Procesamiento completado. Filas generadas: ${normalizedData.length}`);
          resolve(normalizedData);

        } catch (error) {
          Logger.error("🔥 Error crítico en parser:", error);
          reject(error);
        }
      }
    });
  });
};

// Mantenemos la función de diccionario aparte si la necesitas, o la modularizamos igual.
export const parseDictionaryCsv = (csvText: string): Promise<any> => {
    // Implementación similar simplificada...
    return Promise.resolve([]); 
};