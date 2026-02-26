import ExcelJS from 'exceljs';
import type { CartItem } from '../context/useCart';
import type { NormalizedRow } from '../types';

export const generarExcelGradoMilitar = async (
  requestList: CartItem[], 
  allData: NormalizedRow[], 
  storeName: string
) => {
  // 1. Creamos el Libro de Excel y la Pestaña
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Solicitud de Stock');

  // 2. Configuramos el ancho de las columnas (como en tu CSV)
  sheet.columns = [
    { header: '', key: 'colA', width: 25 }, // SKU
    { header: '', key: 'colB', width: 10 }, // Stock CD
    { header: '', key: 'colC', width: 12 }, // Stock Tienda
    { header: '', key: 'colD', width: 10 }, // Tránsito
    { header: '', key: 'colE', width: 12 }, // Venta 2W Estilo
    { header: '', key: 'colF', width: 10 }, // Venta 2W
    { header: '', key: 'colG', width: 8 },  // RA
    { header: '', key: 'colH', width: 12 }, // Sugerencia
    { header: '', key: 'colI', width: 5 },  // Vacía
    { header: '', key: 'colJ', width: 30 }, // Notas (Descripción)
  ];

  let currentRow = 1;

  // 3. Filtramos solo los pedidos de stock (Ignoramos los de RA por ahora)
  const stockItems = requestList.filter(item => (item.requestType || 'stock') === 'stock');

  // 4. Bucle Maestro: Por cada producto en el carrito, creamos un bloque
  for (const item of stockItems) {
    // Espaciado: 2 filas en blanco (como tu CSV)
    currentRow += 2;

    // Fila Identificadora de Tienda (GAP VIÑA DEL MAR)
    sheet.getCell(`C${currentRow}`).value = `GAP ${storeName.toUpperCase()}`;
    sheet.getCell(`C${currentRow}`).font = { bold: true };
    currentRow++;

    // Fila de Código y Descripción
    sheet.getCell(`C${currentRow}`).value = '1007'; // Tu código de tienda (puedes hacerlo dinámico luego)
    sheet.getCell(`J${currentRow}`).value = item.description;
    sheet.getCell(`J${currentRow}`).font = { italic: true };
    currentRow++;

    // Fila de Encabezados Grises
    const headerRow = sheet.getRow(currentRow);
    headerRow.values = ['SKU', 'Stock CD', 'Stock tienda', 'Tránsito', 'Venta 2W estilo.', 'Venta 2W', 'RA.', 'Sugerencia.', '', ''];
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F3F3' } };
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center' };
    });
    currentRow++;

    // 5. La Magia de la Curva Completa
    // Buscamos TODAS las tallas de este modelo en la base de datos (Ej: Todas las S, M, L)
    const curvaCompleta = allData.filter(row => row.sku.startsWith(`${item.sku}_`));

    for (const filaReal of curvaCompleta) {
      const row = sheet.getRow(currentRow);
      
      // Llenamos los datos (Asegúrate de que los nombres de las propiedades coincidan con tu data real)
      row.getCell('A').value = filaReal.sku;
      row.getCell('B').value = Number(filaReal.stock_cd) || 0;
      row.getCell('C').value = Number(filaReal.stock) || 0;
      row.getCell('D').value = Number(filaReal.transit) || 0;
      row.getCell('G').value = filaReal.ra || 0;

      // EL SEMÁFORO (Resaltado Amarillo)
      // ¿Es esta talla específica una de las que el carrito determinó como críticas?
      const tallaDeEstaFila = filaReal.sku.split('_').pop() || '';
      if (item.sizes.includes(tallaDeEstaFila)) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; // Amarillo puro
        });
      }
      
      currentRow++;
    }
  }

  // 6. Generar y Descargar el Archivo (Nativo en el navegador)
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Export_Solicitud_Stock_${storeName}_${new Date().toISOString().split('T')[0]}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
};
