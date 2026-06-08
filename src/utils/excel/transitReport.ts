import type { CartItem } from '../../context/useCart';
import type { NormalizedRow } from '../../types';
import { crearLibroBase, descargarExcel } from './core';
import { agruparPorArea, limpiarNombrePestaña, calcularVenta2wEstilo } from './helpers';

export const generarReporteTransito = async (requestList: CartItem[], allData: NormalizedRow[], storeName: string) => {
  const workbook = crearLibroBase();
  
  // 1. Filtrar solo los ítems de tránsito del carrito
  const transitItems = requestList.filter(item => item.requestType === 'transit');
  const groupedByArea = agruparPorArea(transitItems);

  if (Object.keys(groupedByArea).length === 0) {
    workbook.addWorksheet('Sin Tránsito');
    await descargarExcel(workbook, `Export_Transito_${storeName}_${new Date().toISOString().split('T')[0]}.xlsx`);
    return;
  }

  for (const [areaName, items] of Object.entries(groupedByArea)) {
    const sheet = workbook.addWorksheet(limpiarNombrePestaña(areaName));

    sheet.columns = [
      { header: '', key: 'colA', width: 25 }, { header: '', key: 'colB', width: 10 },
      { header: '', key: 'colC', width: 12 }, { header: '', key: 'colD', width: 10 },
      { header: '', key: 'colE', width: 12 }, { header: '', key: 'colF', width: 10 },
      { header: '', key: 'colG', width: 8 },  { header: '', key: 'colH', width: 18 }
    ];

    let currentRow = 1;

    // Agrupar por categoría
    const byCategory: Record<string, CartItem[]> = {};
    items.forEach(item => {
      const cat = item.category || 'GENERAL';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(item);
    });

    for (const [category, catItems] of Object.entries(byCategory)) {
      const catRow = sheet.getRow(currentRow);
      catRow.values = [`CATEGORÍA: ${category.toUpperCase()}`];
      catRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
      sheet.mergeCells(currentRow, 1, currentRow, 8);
      catRow.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }; });
      currentRow += 2;

      for (const item of catItems) {
        sheet.getCell(`C${currentRow}`).value = item.originStore || storeName;
        sheet.getCell(`C${currentRow}`).font = { bold: true };
        currentRow++;

        sheet.getCell(`A${currentRow}`).value = item.description || item.sku;
        sheet.getCell(`A${currentRow}`).font = { bold: true };
        currentRow++;

        const headerRow = sheet.getRow(currentRow);
        headerRow.values = ['SKU', 'Stock CD', 'Stock tienda', 'Tránsito', 'Venta 2W estilo.', 'Venta 2W', 'RA.', 'Estado.'];
        headerRow.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F3F3' } };
          cell.font = { bold: true, color: { argb: 'FF000000' } };
          cell.alignment = { horizontal: 'center' };
        });
        currentRow++;

        // Buscar la curva real en la base de datos
        const curvaCompleta = allData.filter(row => row.sku.startsWith(`${item.sku}_`) && row.tiendaNombre === (item.originStore || storeName));
        const venta2wEstilo = calcularVenta2wEstilo(curvaCompleta);

        for (const filaReal of curvaCompleta) {
          const row = sheet.getRow(currentRow);
          const transitVal = Number(filaReal.transit) || 0;

          row.getCell('A').value = filaReal.sku;
          row.getCell('B').value = Number(filaReal.stock_cd) || 0;
          row.getCell('C').value = Number(filaReal.stock) || 0;
          row.getCell('D').value = transitVal;
          row.getCell('E').value = venta2wEstilo;
          row.getCell('F').value = Number(filaReal.sales2w) || 0;
          row.getCell('G').value = Number(filaReal.ra) || 0;

          if (transitVal > 0) {
            row.getCell('H').value = 'En Camino 🚚';
            row.getCell('H').font = { bold: true, color: { argb: 'FFB45309' } }; 
            row.eachCell((cell) => { 
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; 
            });
          }

          row.getCell('B').alignment = { horizontal: 'center' };
          row.getCell('C').alignment = { horizontal: 'center' };
          row.getCell('D').alignment = { horizontal: 'center' };
          row.getCell('E').alignment = { horizontal: 'center' };
          row.getCell('F').alignment = { horizontal: 'center' };
          row.getCell('G').alignment = { horizontal: 'center' };
          currentRow++;
        }
        currentRow++; 
      }
    }
  }

  await descargarExcel(workbook, `Export_Transito_${storeName}_${new Date().toISOString().split('T')[0]}.xlsx`);
};
