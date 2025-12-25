import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import type { NormalizedRow } from '../types';

// Definimos los tipos de archivo posibles
type UploadType = 'stock' | 'dictionary';

interface FileUploadProps {
  onUpload: (data: NormalizedRow[], type: UploadType) => void;
  organizationId: string;
}

export default function FileUpload({ onUpload, organizationId }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadType, setUploadType] = useState<UploadType>('stock'); // Por defecto Stock
  const [statusMessage, setStatusMessage] = useState('');
  
  // Función auxiliar de limpieza
  const parseNumber = (value: any): number => {
    if (value === null || value === undefined || value === '') return 0;
    const str = String(value).replace(/[$,\s]/g, '');
    const num = Number(str);
    return isNaN(num) ? 0 : num;
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // 1. UI: Iniciamos estado de carga
    setIsUploading(true);
    setUploadSuccess(false);
    setStatusMessage('Leyendo archivo...');
    console.log('📂 Archivo detectado:', file.name, `(${(file.size / 1024).toFixed(2)} KB)`);

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const binaryStr = e.target?.result;
        const workbook = XLSX.read(binaryStr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Convertimos a matriz de datos
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        console.log(`📊 Hoja leída. Total filas crudas: ${jsonData.length}`);

        let normalizedData: NormalizedRow[] = [];

        // LÓGICA DE PARSEO SEGÚN TIPO DE ARCHIVO
        if (uploadType === 'stock') {
          setStatusMessage('Analizando estructura de tiendas...');
          
          // Referencias Fijas (Sin Búsquedas)
          const headerRow = jsonData[0] || [];
          const attrRow = jsonData[2] || [];

          // Mapeo de Columnas Estáticas (Simple)
          const getColIndex = (keyword: string) => {
            return attrRow.findIndex(cell => 
              cell && String(cell).toLowerCase().trim() === keyword
            );
          };

          const idxSku = getColIndex('sku');
          const idxArea = getColIndex('área');
          const idxCat = getColIndex('categoría');
          const idxDesc = getColIndex('descripción');
          const idxMarca = getColIndex('marca');
          const idxTalla = getColIndex('talla');

          // 1. Detectar Tiendas
          const stores: { name: string; startIndex: number; offsets: Record<string, number> }[] = [];
          
          for (let i = 0; i < headerRow.length; i++) {
            const cell = headerRow[i];
            if (cell && String(cell).trim() !== '') {
              const storeName = String(cell).trim();
              const offsets: Record<string, number> = {};
              
              // Buscamos en las siguientes 15 columnas
              const limit = Math.min(i + 15, attrRow.length);
              
              for (let j = i; j < limit; j++) {
                const colName = String(attrRow[j] || '').toLowerCase().trim();
                
                if (colName.includes('stock')) offsets['stock'] = j;
                if (colName.includes('venta') && colName.includes('2w')) offsets['sales2w'] = j;
                if (colName.includes('tránsito') || colName.includes('transito')) offsets['transit'] = j;
                if (colName.includes('ra.') || colName === 'ra') offsets['ra'] = j;
              }

              if (offsets['stock'] !== undefined) {
                stores.push({ name: storeName, offsets });
              }
            }
          }

          console.log('🏢 Tiendas detectadas:', stores.map(s => s.name));

          // 2. Iterar Filas de Productos (Empiezan en fila 3)
          for (let r = 3; r < jsonData.length; r++) {
            const row = jsonData[r];
            if (!row) continue;

            const skuVal = idxSku !== -1 ? String(row[idxSku]) : 'SKU_DESCONOCIDO';
            if (!skuVal || skuVal.toLowerCase().includes('total')) continue;

            const baseData = {
              sku: skuVal,
              description: idxDesc !== -1 ? String(row[idxDesc]) : '',
              marca: idxMarca !== -1 ? String(row[idxMarca]) : '',
              area: idxArea !== -1 ? String(row[idxArea]) : '',
              categoria: idxCat !== -1 ? String(row[idxCat]) : '',
              talla: idxTalla !== -1 ? String(row[idxTalla]) : '',
            };

            stores.forEach(store => {
              if (store.offsets['stock'] !== undefined) {
                normalizedData.push({
                  ...baseData,
                  tiendaNombre: store.name, // Mapeado a tiendaNombre (antes tienda)
                  stock: parseNumber(row[store.offsets['stock']]),
                  sales2w: parseNumber(row[store.offsets['sales2w']]),
                  transit: parseNumber(row[store.offsets['transit']]),
                  ra: parseNumber(row[store.offsets['ra']]),
                  stock_cd: 0 
                });
              }
            });
          }

        } else {
          console.log('Modo diccionario seleccionado');
        }

        console.log(`✅ Procesamiento finalizado. Filas generadas: ${normalizedData.length}`);
        
        if (normalizedData.length > 0) {
           console.log('🔎 Muestra:', normalizedData[0]);
           setStatusMessage('Subiendo a la base de datos...');
           onUpload(normalizedData, uploadType);
           setUploadSuccess(true);
           setStatusMessage('¡Carga completada con éxito!');
        } else {
           setStatusMessage('Error: No se encontraron datos válidos.');
           console.error('El parser no generó ninguna fila.');
        }

      } catch (error) {
        console.error('❌ Error crítico al procesar:', error);
        setStatusMessage('Error al procesar el archivo.');
      } finally {
        setIsUploading(false);
      }
    };

    reader.readAsBinaryString(file);
  }, [onUpload, uploadType]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'] 
    } 
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-center space-x-6 mb-4">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input 
            type="radio" name="uploadType" value="stock" 
            checked={uploadType === 'stock'} onChange={() => setUploadType('stock')}
            className="form-radio text-blue-600 h-4 w-4"
          />
          <span className="text-gray-700 font-medium">Carga de Stock (Info WX)</span>
        </label>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input 
            type="radio" name="uploadType" value="dictionary" 
            checked={uploadType === 'dictionary'} onChange={() => setUploadType('dictionary')}
            className="form-radio text-green-600 h-4 w-4"
          />
          <span className="text-gray-700 font-medium">Diccionario de Productos</span>
        </label>
      </div>

      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}
          ${uploadSuccess ? 'bg-green-50 border-green-500' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        {isUploading ? (
          <div className="flex flex-col items-center justify-center py-4">
             {/* Animación de Doble Anillo con Gradiente */}
             <div className="relative w-16 h-16 mb-4">
               <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-200 rounded-full opacity-25"></div>
               <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
               {/* Punto central pulsante (estilo "Brain") */}
               <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
             </div>
             
             <p className="text-lg font-semibold text-gray-700 animate-pulse">{statusMessage}</p>
             <p className="text-xs text-gray-400 mt-2">No cierres esta pestaña</p>
          </div>
        ) : uploadSuccess ? (
          <div className="flex flex-col items-center">
            <div className="h-12 w-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3 text-2xl">✓</div>
            <p className="text-green-800 font-bold">¡Carga Exitosa!</p>
          </div>
        ) : (
          <div>
            <p className="text-xl text-gray-600 mb-2">Arrastra tu archivo Excel / CSV aquí</p>
            <p className="text-sm text-gray-400">Soporta .xlsx, .xls y .csv</p>
          </div>
        )}
      </div>
    </div>
  );
}