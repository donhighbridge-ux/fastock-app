import type { CartItem } from '../../context/useCart';
import { crearLibroBase, descargarExcel } from './core';
import { agruparPorArea, limpiarNombrePestaña } from './helpers';

export const generarReporteUltimasTallas = async (requestList: CartItem[], storeName: string) => {
  const workbook = crearLibroBase();
  
  // Filtramos la data directo desde la fuente, igual que en stockReport
  const ultimasItems = requestList.filter(item => item.requestType === 'ultimas');
  const groupedByArea = agruparPorArea(ultimasItems);

  if (Object.keys(groupedByArea).length === 0) {
    workbook.addWorksheet('Sin Últimas Tallas');
  }

  for (const [areaName, items] of Object.entries(groupedByArea)) {
    const sheet = workbook.addWorksheet(limpiarNombrePestaña(areaName));

    // Columnas ajustadas para el Planner
    sheet.columns = [
      { header: '', key: 'colA', width: 20 }, // SKU Base
      { header: '', key: 'colB', width: 45 }, // Descripción
      { header: '', key: 'colC', width: 15 }, // Tienda
      { header: '', key: 'colD', width: 35 }, // Tallas Restantes
    ];

    let currentRow = 2;
    
    sheet.getCell(`A${currentRow}`).value = `GAP ${storeName.toUpperCase()} - REPORTE DE ÚLTIMAS TALLAS`;
    sheet.getCell(`A${currentRow}`).font = { bold: true, size: 12 };
    currentRow += 2;

    // Encabezados con estilo oscuro (Para diferenciar visualmente del verde de stock y morado de RA)
    const headerRow = sheet.getRow(currentRow);
    headerRow.values = ['SKU Base', 'Descripción', 'Tienda Origen', 'Tallas Físicas Restantes'];
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4B5563' } }; // Gris oscuro
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; // Letra blanca
      cell.alignment = { horizontal: 'center' };
    });
    currentRow++;

    // Llenado de filas
    for (const item of items) {
      const row = sheet.getRow(currentRow);
      
      row.getCell('A').value = item.sku;
      row.getCell('A').font = { bold: true };
      
      row.getCell('B').value = item.description;
      row.getCell('B').font = { italic: true };
      
      row.getCell('C').value = item.originStore || storeName;
      
      row.getCell('D').value = item.sizes.join(' - ');
      row.getCell('D').font = { bold: true };
      
      // Centrado táctico
      row.getCell('A').alignment = { horizontal: 'center' };
      row.getCell('C').alignment = { horizontal: 'center' };
      row.getCell('D').alignment = { horizontal: 'center' };
      
      currentRow++;
    }
  }

  await descargarExcel(workbook, `Export_Ultimas_Tallas_${storeName}_${new Date().toISOString().split('T')[0]}.xlsx`);
};
