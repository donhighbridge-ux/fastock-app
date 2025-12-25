const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, 'mock_stock.csv');
const ROW_COUNT = 500;

// --- CONFIGURACIÓN DE DATOS ---

const SIZES = [
  'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXS', '28 x 30', '29 x 30', '29 x 32', '30 x 30', '30 x 32',
  '31 x 30', '31 x 32', '32 x 30', '32 x 32', '32 x 34', '33 x 30', '33 x 32', '34 x 30', '34 x 32',
  '34 x 34', '36 x 30', '36 x 32', '36 x 34', '38 x 32', '38 x 30', '40 x 32', '40 x 34', '24',
  '25', '26', '27', '28', '29', '30', '31', '32', 'XS (4-5)', 'S / (6)', 'M / (8)', 'L / (10)',
  'XL / (12)', 'XXL / (14-16)', '33', '34', '35', '36', '38', '40', '6', '7', '8', '10', '12',
  '14', '16', '0 0', '0', '2', '4'
];

const FIXED_HEADERS = [
  'SEGM', 'Marca', 'Área', 'Categoría', 'Subcategoría', 'Temporada', 'Descripción', 'Estilo Color', 'Talla', 'SKU', 'Stock CD'
];

const STORE_METRIC_HEADERS = [
  'Stock tienda', 'Tránsito', 'Venta 2W estilo.', 'Venta 2W', 'RA.', 'Sugerencia.', 'Semanas stock.'
];

const STORES = [
  { name: 'GAP TIENDA MOCK A', id: '9001' },
  { name: 'GAP TIENDA MOCK B', id: '9002' },
  { name: 'GAP TIENDA MOCK C', id: '9003' },
  { name: 'GAP TIENDA MOCK D', id: '9004' },
  { name: 'GAP TIENDA MOCK E', id: '9005' }
];

const AREAS = ['HOMBRES', 'MUJERES', 'NIÑOS', 'BEBES'];
const CATEGORIES = ['POLERAS', 'JEANS', 'ACCESORIOS', 'CHAQUETAS'];

// --- UTILIDADES ---

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

// --- GENERACIÓN ---

const generateCsv = () => {
  const rows = [];
  const totalColumns = FIXED_HEADERS.length + (STORES.length * STORE_METRIC_HEADERS.length);

  // 1. Fila 0: Nombres de Tiendas (Espaciados)
  const row0 = new Array(totalColumns).fill('');
  STORES.forEach((store, index) => {
    const colIndex = FIXED_HEADERS.length + (index * STORE_METRIC_HEADERS.length);
    row0[colIndex] = store.name;
  });
  rows.push(row0.join(','));

  // 2. Fila 1: IDs de Tiendas (Espaciados)
  const row1 = new Array(totalColumns).fill('');
  STORES.forEach((store, index) => {
    const colIndex = FIXED_HEADERS.length + (index * STORE_METRIC_HEADERS.length);
    row1[colIndex] = store.id;
  });
  rows.push(row1.join(','));

  // 3. Fila 2: Encabezados de Datos (Fijos + Repetidos)
  const row2 = [...FIXED_HEADERS];
  STORES.forEach(() => {
    row2.push(...STORE_METRIC_HEADERS);
  });
  rows.push(row2.join(','));

  // 4. Filas de Datos (Productos)
  for (let i = 0; i < ROW_COUNT; i++) {
    const sku = `999${i.toString().padStart(3, '0')}_GP00_MOCK`;
    const area = randomItem(AREAS);
    const category = randomItem(CATEGORIES);
    const size = randomItem(SIZES);
    
    // Datos fijos del producto
    const productData = [
      'MOCK_SEGM',       // SEGM
      'GAP',             // Marca
      area,              // Área
      category,          // Categoría
      'BASICO',          // Subcategoría
      '2024',            // Temporada
      `PRODUCTO MOCK ${i}`, // Descripción
      'MOCK COLOR',      // Estilo Color
      size,              // Talla (CRÍTICO: Real)
      sku,               // SKU
      randomInt(0, 100)  // Stock CD
    ];

    // Datos por tienda
    const storeData = [];
    STORES.forEach(() => {
      // Generamos métricas para cada tienda
      storeData.push(randomInt(0, 50)); // Stock tienda
      storeData.push(randomInt(0, 20)); // Tránsito
      storeData.push(randomInt(0, 10)); // Venta 2W estilo
      storeData.push(randomInt(0, 10)); // Venta 2W
      storeData.push(randomInt(0, 5));  // RA
      storeData.push(randomInt(0, 5));  // Sugerencia
      storeData.push(randomInt(0, 12)); // Semanas stock
    });

    rows.push([...productData, ...storeData].join(','));
  }

  // Escribir archivo
  fs.writeFileSync(OUTPUT_FILE, rows.join('\n'), 'utf8');
  console.log(`✅ Archivo generado exitosamente: ${OUTPUT_FILE}`);
  console.log(`📊 Filas de datos: ${ROW_COUNT}`);
};

generateCsv();