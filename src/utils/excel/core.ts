import ExcelJS from 'exceljs';

export const crearLibroBase = () => {
  return new ExcelJS.Workbook();
};

export const descargarExcel = async (workbook: ExcelJS.Workbook, nombreArchivo: string) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  window.URL.revokeObjectURL(url);
};
