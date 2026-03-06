import type { CartItem } from '../../context/useCart';
import type { NormalizedRow } from '../../types';
import { crearLibroBase, descargarExcel } from './core';
import { agruparPorArea, limpiarNombrePestaña, calcularVenta2wEstilo } from './helpers';

export const generarReporteStock = async (requestList: CartItem[], allData: NormalizedRow[], storeName: string) => {
  const workbook = crearLibroBase();
  const stockItems = requestList.filter(item => (item.requestType || 'stock') === 'stock');
  const groupedByArea = agruparPorArea(stockItems);

  if (Object.keys(groupedByArea).length === 0) workbook.addWorksheet('Vacío');

  for (const [areaName, items] of Object.entries(groupedByArea)) {
    const sheet = workbook.addWorksheet(limpiarNombrePestaña(areaName));
    
    sheet.columns = [
      { header: '', key: 'colA', width: 25 }, { header: '', key: 'colB', width: 10 },
      { header: '', key: 'colC', width: 12 }, { header: '', key: 'colD', width: 10 },
      { header: '', key: 'colE', width: 12 }, { header: '', key: 'colF', width: 10 },
      { header: '', key: 'colG', width: 8 },  { header: '', key: 'colH', width: 12 },
      { header: '', key: 'colI', width: 5 },  { header: '', key: 'colJ', width: 30 },
    ];

    let currentRow = 1;

    for (const item of items) {
      currentRow += 2;
      sheet.getCell(`C${currentRow}`).value = `GAP ${storeName.toUpperCase()}`;
      sheet.getCell(`C${currentRow}`).font = { bold: true };
      currentRow++;

      sheet.getCell(`C${currentRow}`).value = '1007'; 
      sheet.getCell(`J${currentRow}`).value = item.description;
      sheet.getCell(`J${currentRow}`).font = { italic: true };
      currentRow++;

      const headerRow = sheet.getRow(currentRow);
      headerRow.values = ['SKU', 'Stock CD', 'Stock tienda', 'Tránsito', 'Venta 2W estilo.', 'Venta 2W', 'RA.', 'Sugerencia.', '', ''];
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F3F3' } };
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center' };
      });
      currentRow++;

      const curvaCompleta = allData.filter(row => row.sku.startsWith(`${item.sku}_`) && row.tiendaNombre === item.originStore);
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

        const tallaDeEstaFila = filaReal.sku.split('_').pop() || '';
        if (item.sizes.includes(tallaDeEstaFila)) {
          row.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; });
        }
        currentRow++;
      }
    }
  }

  await descargarExcel(workbook, `Export_Solicitud_Stock_${storeName}_${new Date().toISOString().split('T')[0]}.xlsx`);
};
