import Papa from 'papaparse';
import Logger from './logger';
import type { NormalizedRow, ProductDictionaryItem } from '../types';

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
export const parseAndNormalizeCsv = (csvText: string): Promise<{ normalizedData: NormalizedRow[], dictionaryUpdate: ProductDictionaryItem[] }> => {
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          Logger.log('Iniciando normalización de datos...');
          const data = results.data as string[][];

          // --- 1. Identificar filas clave ---
          // Fila 0: Nombres de Tiendas
          // Fila 2: Nombres de Métricas (SKU, Stock, etc.)
          // Fila 3 en adelante: Datos de productos
          const storeNameRow = data[0] || [];
          const metricHeaderRow = data[2] || [];
          const dataRows = data.slice(3);

          // --- 2. Mapeo de Tiendas (Estrategia de Mapeo) ---
          const stores: { name: string, id: string, startIndex: number }[] = [];
          // Lista negra de palabras clave, normalizadas (mayúsculas, sin tildes).
          const BLACKLIST = ['TRANSITO', 'TOTAL', 'STOCK', 'VENTA', 'SUGERENCIA', 'SEMANAS'];

          // Función de limpieza agresiva para normalizar los encabezados antes de comparar.
          const aggressivelyNormalize = (text: string): string => {
            if (!text) return '';
            return text
              .toString()
              .normalize("NFD") // Descompone caracteres (á -> a + ´)
              .replace(/[\u0300-\u036f]/g, "") // Borra los diacríticos (las tildes)
              .toUpperCase()
              .trim();
          };

          storeNameRow.forEach((name, index) => {
            if (!name || name.trim() === '') return;

            const cleanValue = aggressivelyNormalize(name);

            // Si la palabra limpia contiene ALGUNA de las palabras prohibidas, la ignoramos.
            if (BLACKLIST.some(badWord => cleanValue.includes(badWord))) {
                Logger.log(`🚫 Ignorando columna (posible falsa tienda): "${name}"`);
                return; // Saltar esta columna, no es una tienda real
            }

            stores.push({
              name: name.trim(),
              id: name.trim(), // Usamos el nombre como ID si no hay otro identificador
              startIndex: index,
            });
          });
          Logger.log(`${stores.length} tiendas detectadas.`, stores.map(s => s.name));

          // --- 3. Mapeo de Columnas Fijas y Métricas ---
          const findIndex = (headerName: string) => metricHeaderRow.findIndex(h => h && h.toLowerCase().includes(headerName.toLowerCase()));
          
          const productMetadataIndices = {
            sku: findIndex('sku'),
            description: findIndex('descripción'),
            styleColor: findIndex('estilo color'),
            size: findIndex('talla'),
            category: findIndex('categoría'),
            area: findIndex('área'),
            marca: findIndex('marca'),
          };

          // Encontrar el offset de la métrica "Stock tienda" dentro del bloque de una tienda
          const stockMetricOffset = metricHeaderRow
            .slice(stores[0]?.startIndex || 0, (stores[1]?.startIndex || Infinity))
            .findIndex(h => h && h.toLowerCase().includes('stock tienda'));

          if (stockMetricOffset === -1) {
            throw new Error('No se pudo encontrar la columna de métrica "Stock tienda" en la fila de encabezados.');
          }

          // --- 4. Iteración de Datos y Normalización ---
          const normalizedData: NormalizedRow[] = [];
          const productDictionary = new Map<string, ProductDictionaryItem>();

          for (const productRow of dataRows) {
            const sku = productRow[productMetadataIndices.sku];
            // Ignorar filas vacías o de totales
            if (!sku || sku.toLowerCase().includes('total')) {
              continue;
            }

            const baseProductData = {
              sku: sku,
              description: productRow[productMetadataIndices.description] || '',
              styleColor: productRow[productMetadataIndices.styleColor] || '',
              size: productRow[productMetadataIndices.size] || '',
              marca: productRow[productMetadataIndices.marca] || '',
              division: productRow[productMetadataIndices.area] || '', // Mapeamos Área -> division (UI)
              subDivision: productRow[productMetadataIndices.category] || '', // Mapeamos Categoría -> subDivision (UI)
            };

            // Extraer y guardar en el diccionario (si no existe ya)
            if (!productDictionary.has(baseProductData.sku)) {
              productDictionary.set(baseProductData.sku, {
                sku: baseProductData.sku,
                name: baseProductData.description,
                category: productRow[productMetadataIndices.category] || '',
                area: productRow[productMetadataIndices.area] || '',
              });
            }

            // Bucle de Tiendas para extraer stock
            for (const store of stores) {
              const stockColumnIndex = store.startIndex + stockMetricOffset;
              const stockValue = cleanAndParseNumber(productRow[stockColumnIndex]);

              // Solo crear la entrada si hay stock
              if (stockValue > 0) {
                normalizedData.push({
                  ...baseProductData,
                  tiendaNombre: store.name,
                  tiendaId: store.id,
                  stockTienda: stockValue,
                } as unknown as NormalizedRow);
              }
            }
          }

          Logger.log('Normalización completada.');
          const dictionaryUpdate = Array.from(productDictionary.values());
          resolve({ normalizedData, dictionaryUpdate });
        } catch (error) {
          reject(error);
        }
      },
      error: (error: any) => reject(error),
    });
  });
};

/**
 * Parsea un archivo CSV de diccionario de productos.
 * @param {string} csvText El contenido del archivo CSV del diccionario.
 * @returns {Promise<ProductDictionaryItem[]>} Una promesa que se resuelve con los items del diccionario.
 */
export const parseDictionaryCsv = (csvText: string): Promise<{ products: ProductDictionaryItem[], sizes: { code: string, label: string }[] }> => {
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true, // Asumimos que el CSV del diccionario tiene encabezados
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const products: ProductDictionaryItem[] = [];
          const sizes: { code: string, label: string }[] = [];

          for (const row of results.data as any[]) {
            // Procesa la información del producto si existe en la fila
            if (row.SKU && row['Nombre NO técnico']) {
              products.push({
                sku: row.SKU.trim(),
                friendlyName: row['Nombre NO técnico'].trim(),
                category: row.Categoria?.trim() || '',
                area: row.Area?.trim() || '',
              });
            }

            // Procesa la información de la talla si existe en la fila
            if (row['Talla larga'] && row['Talla simple']) {
              sizes.push({
                code: row['Talla larga'].trim(),
                label: row['Talla simple'].trim(),
              });
            }
          }

          Logger.log(`Diccionario parseado: ${products.length} productos, ${sizes.length} tallas.`);
          resolve({ products, sizes });
        } catch (e) {
          reject(e);
        }
      },
      error: (error: any) => reject(error),
    });
  });
};