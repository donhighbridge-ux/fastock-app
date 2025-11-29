import Papa from 'papaparse';
import Logger from './logger';

export interface NormalizedRow {
  sku: string;
  tiendaId: string;
  [key: string]: any;
}

/**
 * Limpia un valor de texto (quitando comas) y lo convierte a número.
 * Si el valor está vacío o no es un número válido, devuelve 0.
 * @param {string} value - El valor a limpiar y parsear.
 * @returns {number} El valor como número, o 0 por defecto.
 */
const cleanAndParseNumber = (value: string): number => {
  if (!value || typeof value !== 'string') {
    return 0;
  }
  const cleanedValue = value.replace(/,/g, '');
  const number = parseFloat(cleanedValue);
  return isNaN(number) ? 0 : number;
};

/**
 * Normaliza una cadena de encabezado a un formato estándar:
 * minúsculas, sin espacios al inicio/final y reemplazando guiones bajos por espacios.
 * @param {string} header - El encabezado a normalizar.
 * @returns {string} El encabezado normalizado.
 */
const normalizeHeader = (header: string): string => (header || '').toLowerCase().trim().replace(/_/g, ' ');

// Mapeo de encabezados NORMALIZADOS a claves de objeto camelCase.
const headerMapping: { [key: string]: string } = {
  'stock tienda': 'stockTienda',
  'tránsito': 'transito',
  'venta 2w estilo.': 'venta2WEstilo',
  'venta 2w': 'venta2W',
  'semanas stock.': 'semanasStock',
  'sku': 'sku'
};

/**
 * Normaliza los datos de un archivo CSV con estructura "ancha" a una "larga".
 * @param {string} csvText El contenido del archivo CSV como una cadena de texto.
 * @returns {Promise<NormalizedRow[]>} Una promesa que se resuelve con los datos normalizados.
 */
export const parseAndNormalizeCsv = (csvText: string): Promise<NormalizedRow[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          Logger.log('Iniciando normalización de datos...');
          const data = results.data as string[][];

          // --- 1. Mapeo de Tiendas y sus Columnas ---
          const storeHeaderRow = data[0];
          const storeIdRow = data[1];
          const stores = [];
          const STORE_DATA_WIDTH = 7;
          const PRODUCT_DATA_END_INDEX = 11;

          for (let i = PRODUCT_DATA_END_INDEX + 1; i < storeHeaderRow.length; i += STORE_DATA_WIDTH) {
            const storeName = storeHeaderRow[i];
            if (storeName) {
              stores.push({
                name: storeName,
                id: storeIdRow[i]?.trim(),
                startIndex: i,
              });
            }
          }

          // --- 2. Mapeo de Encabezados de Producto y Tienda ---
          const productHeaders = data[2].slice(0, PRODUCT_DATA_END_INDEX + 1).map(h => normalizeHeader(h || `columna_${Math.random()}`));
          const rawStoreMetricHeaders = data[2].slice(
            PRODUCT_DATA_END_INDEX + 1,
            PRODUCT_DATA_END_INDEX + 1 + STORE_DATA_WIDTH
          ).map(h => normalizeHeader(h || `metrica_${Math.random()}`));

          const storeMetricHeaders = rawStoreMetricHeaders.map(header =>
            headerMapping[header] || header.replace(/\s+/g, '_').replace(/\./g, '')
          );

          // --- 3. Procesamiento y Normalización de Filas ---
          const normalizedData: NormalizedRow[] = [];
          const productRows = data.slice(4);

          for (const productRow of productRows) {
            if (!productRow[10] || normalizeHeader(productRow[0]) === 'total') {
              continue;
            }

            const baseProductData: { [key: string]: any } = {};
            productHeaders.forEach((header, index) => {
              const key = headerMapping[header] || header.replace(/\s+/g, '_').replace(/\./g, '');
              baseProductData[key] = productRow[index] || '';
            });

            for (const store of stores) {
              const storeData: { [key: string]: any } = {};
              rawStoreMetricHeaders.forEach((rawHeader, index) => {
                const columnIndex = store.startIndex + index;
                const metricHeader = storeMetricHeaders[index];
                const value = cleanAndParseNumber(productRow[columnIndex]);
                storeData[metricHeader] = value;
              });

              normalizedData.push({ ...baseProductData, tiendaNombre: store.name, tiendaId: store.id, ...storeData } as NormalizedRow);
            }
          }
          Logger.log('Normalización completada.');
          resolve(normalizedData);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => reject(error),
    });
  });
};