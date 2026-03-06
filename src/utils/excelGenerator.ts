import ExcelJS from 'exceljs';
import type { CartItem } from '../context/useCart';
import type { NormalizedRow } from '../types';

export const generarExcelGradoMilitar = async (
  requestList: CartItem[], 
  allData: NormalizedRow[], 
  storeName: string
) => {
  // 1. Iniciamos el motor del libro
  const workbook = new ExcelJS.Workbook();

  // 2. Filtramos solo los pedidos de stock
  const stockItems = requestList.filter(item => (item.requestType || 'stock') === 'stock');

  // 3. AGRUPAMIENTO INTELIGENTE POR ÁREA (El núcleo de la Opción B)
  const groupedByArea = stockItems.reduce((acc, item) => {
    const area = item.area || 'Sin Área'; // Si un producto no tiene área, lo manda aquí
    if (!acc[area]) {
      acc[area] = [];
    }
    acc[area].push(item);
    return acc;
  }, {} as Record<string, CartItem[]>);

  // Seguridad: Si el carrito está extrañamente vacío, creamos una hoja en blanco para que no falle
  if (Object.keys(groupedByArea).length === 0) {
    workbook.addWorksheet('Vacío');
  }

  // 4. BUCLE PRINCIPAL: Iteramos por cada Área (HOMBRE, MUJER, etc.)
  for (const [areaName, items] of Object.entries(groupedByArea)) {
    // Excel tiene reglas estrictas: Nombres de pestaña máx 31 caracteres y sin símbolos raros
    const safeAreaName = areaName.substring(0, 31).replace(/[\\/*?:[\]]/g, '');
    
    // Creamos la pestaña con el nombre del Área
    const sheet = workbook.addWorksheet(safeAreaName);

    // Configuramos el ancho de las columnas exclusivas para ESTA pestaña
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

    // 5. BUCLE SECUNDARIO: Imprimimos los productos que pertenecen a esta Área
    for (const item of items) {
      currentRow += 2; // Dos filas en blanco de separador

      // Fila Identificadora de Tienda
      sheet.getCell(`C${currentRow}`).value = `GAP ${storeName.toUpperCase()}`;
      sheet.getCell(`C${currentRow}`).font = { bold: true };
      currentRow++;

      // Fila de Código y Descripción
      sheet.getCell(`C${currentRow}`).value = '1007'; // Código de tienda quemado
      sheet.getCell(`J${currentRow}`).value = item.description;
      sheet.getCell(`J${currentRow}`).font = { italic: true };
      currentRow++;

      // Encabezados Grises
      const headerRow = sheet.getRow(currentRow);
      headerRow.values = ['SKU', 'Stock CD', 'Stock tienda', 'Tránsito', 'Venta 2W estilo.', 'Venta 2W', 'RA.', 'Sugerencia.', '', ''];
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F3F3' } };
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center' };
      });
      currentRow++;

      // Extracción de la curva completa del modelo POR TIENDA
      const curvaCompleta = allData.filter(row => 
        row.sku.startsWith(`${item.sku}_`) && 
        row.tiendaNombre === item.originStore
      );

      const venta2wEstilo = curvaCompleta.reduce((total, fila) => {
        return total + (Number(fila.sales2w) || 0);
      }, 0);

      // Llenado de Tallas
      for (const filaReal of curvaCompleta) {
        const row = sheet.getRow(currentRow);
        
        row.getCell('A').value = filaReal.sku;
        row.getCell('B').value = Number(filaReal.stock_cd) || 0;
        row.getCell('C').value = Number(filaReal.stock) || 0;
        row.getCell('D').value = Number(filaReal.transit) || 0;
        row.getCell('E').value = venta2wEstilo; // Total del estilo (igual en todas las filas de este bloque)
        row.getCell('F').value = Number(filaReal.sales2w) || 0; // Venta individual de esta talla
        row.getCell('G').value = filaReal.ra || 0;

        // Semáforo Amarillo
        const tallaDeEstaFila = filaReal.sku.split('_').pop() || '';
        if (item.sizes.includes(tallaDeEstaFila)) {
          row.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
          });
        }
        
        currentRow++;
      }
    }
  }

  // 6. Generar y Descargar
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Export_Solicitud_Stock_${storeName}_${new Date().toISOString().split('T')[0]}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
};

// ============================================================================
// MOTOR 2: EXPORTACIÓN DE REPOSICIÓN AUTOMÁTICA (RA)
// ============================================================================
export const generarExcelRA = async (
  requestList: CartItem[], 
  allData: NormalizedRow[], 
  storeName: string
) => {
  const workbook = new ExcelJS.Workbook();

  // 1. Filtramos EXCLUSIVAMENTE los pedidos de RA
  const raItems = requestList.filter(item => item.requestType === 'ra');

  // 2. Agrupamiento por Área
  const groupedByArea = raItems.reduce((acc, item) => {
    const area = item.area || 'Sin Área';
    if (!acc[area]) acc[area] = [];
    acc[area].push(item);
    return acc;
  }, {} as Record<string, CartItem[]>);

  if (Object.keys(groupedByArea).length === 0) {
    workbook.addWorksheet('Sin RA');
  }

  // 3. Bucle de Pestañas
  for (const [areaName, items] of Object.entries(groupedByArea)) {
    const safeAreaName = areaName.substring(0, 31).replace(/[\\/*?:[\]]/g, '');
    const sheet = workbook.addWorksheet(safeAreaName);

    sheet.columns = [
      { header: '', key: 'colA', width: 25 },
      { header: '', key: 'colB', width: 10 },
      { header: '', key: 'colC', width: 12 },
      { header: '', key: 'colD', width: 10 },
      { header: '', key: 'colE', width: 12 },
      { header: '', key: 'colF', width: 10 },
      { header: '', key: 'colG', width: 12 }, // RA Actual
      { header: '', key: 'colH', width: 12 }, // RA Propuesto (Nuevo)
      { header: '', key: 'colI', width: 5 },
      { header: '', key: 'colJ', width: 30 },
    ];

    let currentRow = 1;

    // 4. Bucle de Productos
    for (const item of items) {
      currentRow += 2; 

      sheet.getCell(`C${currentRow}`).value = `GAP ${storeName.toUpperCase()}`;
      sheet.getCell(`C${currentRow}`).font = { bold: true };
      currentRow++;

      sheet.getCell(`C${currentRow}`).value = '1007'; // Deuda técnica mapeada
      sheet.getCell(`J${currentRow}`).value = item.description;
      sheet.getCell(`J${currentRow}`).font = { italic: true };
      currentRow++;

      // Encabezados (Modificados para RA)
      const headerRow = sheet.getRow(currentRow);
      headerRow.values = ['SKU', 'Stock CD', 'Stock tienda', 'Tránsito', 'Venta 2W estilo.', 'Venta 2W', 'RA Actual.', 'RA Propuesto.', '', ''];
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F3F3' } };
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center' };
      });
      currentRow++;

      // Extracción de la curva completa con bloqueo por tienda
      const curvaCompleta = allData.filter(row => 
        row.sku.startsWith(`${item.sku}_`) && 
        row.tiendaNombre === item.originStore
      );

      // Matemática Grado Militar
      const venta2wEstilo = curvaCompleta.reduce((total, fila) => {
        return total + (Number(fila.sales2w) || 0);
      }, 0);

      // 5. Llenado de Tallas
      for (const filaReal of curvaCompleta) {
        const row = sheet.getRow(currentRow);
        const tallaDeEstaFila = filaReal.sku.split('_').pop() || '';
        
        // ¿Hay una propuesta de RA para esta talla en específico?
        const raPropuesto = item.proposedRaMap ? item.proposedRaMap[tallaDeEstaFila] : null;

        row.getCell('A').value = filaReal.sku;
        row.getCell('B').value = Number(filaReal.stock_cd) || 0;
        row.getCell('C').value = Number(filaReal.stock) || 0;
        row.getCell('D').value = Number(filaReal.transit) || 0;
        row.getCell('E').value = venta2wEstilo;
        row.getCell('F').value = Number(filaReal.sales2w) || 0;
        row.getCell('G').value = Number(filaReal.ra) || 0; // El RA que tiene actualmente
        
        // Si hay propuesta, la mostramos en la columna H
        row.getCell('H').value = raPropuesto ? Number(raPropuesto) : ''; 

        // EL SEMÁFORO ORQUÍDEA
        if (raPropuesto !== null && raPropuesto !== undefined) {
          row.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDA70D6' } }; // Color Orquídea
          });
        }
        
        currentRow++;
      }
    }
  }

  // 6. Descarga con nombre diferenciado
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Export_Solicitud_RA_${storeName}_${new Date().toISOString().split('T')[0]}.xlsx`; // Nombre distinto
  a.click();
  window.URL.revokeObjectURL(url);
};
