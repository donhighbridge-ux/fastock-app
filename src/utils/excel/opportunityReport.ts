import type { CartItem } from '../../context/useCart';
import type { NormalizedRow } from '../../types';
import { crearLibroBase, descargarExcel } from './core';
import { agruparPorArea, limpiarNombrePestaña, calcularVenta2wEstilo } from './helpers';

export const generarReporteOportunidades = async (requestList: CartItem[], allData: NormalizedRow[], storeName: string) => {
  const workbook = crearLibroBase();
  
  // 🛡️ Filtramos estricta y únicamente las oportunidades
  const opportunityItems = requestList.filter(item => item.requestType === 'opportunity');
  const groupedByArea = agruparPorArea(opportunityItems);

  if (Object.keys(groupedByArea).length === 0) {
    workbook.addWorksheet('Sin Oportunidades');
    await descargarExcel(workbook, `Export_Oportunidades_Vacio_${new Date().toISOString().split('T')[0]}.xlsx`);
    return;
  }

  for (const [areaName, items] of Object.entries(groupedByArea)) {
    const sheet = workbook.addWorksheet(limpiarNombrePestaña(areaName));
    
    // Mismo formato exacto que stockReports
    // Columnas clásicas de tu formato
    sheet.columns = [
      { header: '', key: 'colA', width: 25 }, { header: '', key: 'colB', width: 10 },
      { header: '', key: 'colC', width: 12 }, { header: '', key: 'colD', width: 10 },
      { header: '', key: 'colE', width: 12 }, { header: '', key: 'colF', width: 10 },
      { header: '', key: 'colG', width: 8 },  { header: '', key: 'colH', width: 25 }
    ];

    let currentRow = 1;

    // Agrupamos por categoría
    const itemsByCategory: Record<string, CartItem[]> = {};
    items.forEach(item => {
      const cat = item.category || 'GENERAL';
      if (!itemsByCategory[cat]) itemsByCategory[cat] = [];
      itemsByCategory[cat].push(item);
    });

    for (const [category, catItems] of Object.entries(itemsByCategory)) {
      // 1. BLOQUE DE HIT LIST (Contexto del Mueble)
      const catRow = sheet.getRow(currentRow);
      catRow.values = [`CATEGORÍA: ${category.toUpperCase()}`];
      catRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
      sheet.mergeCells(currentRow, 1, currentRow, 8);
      catRow.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }; });
      currentRow++;

      const contextData = catItems[0].categoryHealth || [];
      contextData.forEach((line, index) => {
        const ctxRow = sheet.getRow(currentRow);
        ctxRow.values = [index === 0 ? '📊 SALUD DE LA CATEGORÍA:' : '', line];
        ctxRow.font = { italic: index !== 0, bold: index === 0, color: { argb: index === 0 ? 'FF000000' : 'FFEF4444' } };
        sheet.mergeCells(currentRow, 2, currentRow, 8);
        currentRow++;
      });
      currentRow += 2; // Espacio antes de los productos

      // 2. BLOQUE DE PRODUCTOS (Formato Clásico Talla x Talla)
      for (const item of catItems) {
        // Cabeceras del producto (Tienda y Descripción)
        sheet.getCell(`C${currentRow}`).value = storeName;
        sheet.getCell(`C${currentRow}`).font = { bold: true };
        currentRow++;

        sheet.getCell(`A${currentRow}`).value = item.description;
        sheet.getCell(`A${currentRow}`).font = { bold: true };
        currentRow++;

        const headerRow = sheet.getRow(currentRow);
        headerRow.values = ['SKU', 'Stock CD', 'Stock tienda', 'Tránsito', 'Venta 2W estilo.', 'Venta 2W', 'RA.', 'Sugerencia.'];
        headerRow.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F3F3' } };
          cell.font = { bold: true, color: { argb: 'FF000000' } };
          cell.alignment = { horizontal: 'center' };
        });
        currentRow++;

        // Buscar todas las tallas de este modelo en la base de datos
        const curvaCompleta = allData.filter(row => row.sku.startsWith(`${item.sku}_`) && row.tiendaNombre === (item.originStore || storeName));
        const venta2wEstilo = calcularVenta2wEstilo(curvaCompleta);

        for (const filaReal of curvaCompleta) {
          const row = sheet.getRow(currentRow);
          row.getCell('A').value = filaReal.sku;
          row.getCell('B').value = Number(filaReal.stock_cd) || 0;
          row.getCell('C').value = Number(filaReal.stock) || 0;
          row.getCell('D').value = Number(filaReal.transit) || 0;
          row.getCell('E').value = venta2wEstilo;
          row.getCell('F').value = Number(filaReal.sales2w) || 0;
          row.getCell('G').value = Number(filaReal.ra) || 0;

          // Destacar si la talla es parte de la sugerencia óptima del CD
          const tallaDeEstaFila = filaReal.sku.split('_').pop() || '';
          if (item.sizes.includes(tallaDeEstaFila)) {
            row.getCell('H').value = 'Top 10 - Recomendado';
            row.getCell('H').font = { color: { argb: 'FF059669' }, bold: true }; // Verde
          } else {
            row.getCell('H').value = 'No sugerido (Sin Stock CD)';
            row.getCell('H').font = { color: { argb: 'FF9CA3AF' } }; // Gris
          }
          
          row.getCell('B').alignment = { horizontal: 'center' };
          row.getCell('C').alignment = { horizontal: 'center' };
          row.getCell('D').alignment = { horizontal: 'center' };
          row.getCell('E').alignment = { horizontal: 'center' };
          row.getCell('F').alignment = { horizontal: 'center' };
          row.getCell('G').alignment = { horizontal: 'center' };
          currentRow++;
        }
        currentRow++; // Espacio entre productos
      }
    }
  }
  await descargarExcel(workbook, `Export_Oportunidades_${storeName}_${new Date().toISOString().split('T')[0]}.xlsx`);
};
