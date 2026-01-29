import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import type { NormalizedRow } from '../types';
import { parseAndNormalizeCsv, parseDictionaryCsv } from '../utils/csvParserLogic';

type UploadType = 'stock' | 'dictionary';

interface FileUploadProps {
  onUpload: (data: NormalizedRow[], type: UploadType) => void;
  // Eliminado organizationId porque no se usa aquí
}

export default function FileUpload({ onUpload }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadType, setUploadType] = useState<UploadType>('stock');
  const [statusMessage, setStatusMessage] = useState('');

  // 1. Lógica de Puente: Excel -> CSV -> ParserLogic
  // Eliminado el argumento 'file' porque era redundante. Solo necesitamos el contenido binario.
  const processStockFile = async (binaryStr: string | ArrayBuffer) => {
    setStatusMessage('Convirtiendo formato Excel...');
    
    const workbook = XLSX.read(binaryStr, { type: 'binary' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // Forzamos CSV con punto y coma para estandarizar la entrada al parser
    const csvOutput = XLSX.utils.sheet_to_csv(sheet, { FS: ';' }); 

    setStatusMessage('Analizando y Blindando datos...');
    // Delegamos al especialista (csvParserLogic)
    const normalizedData = await parseAndNormalizeCsv(csvOutput);

    return normalizedData;
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsUploading(true);
    setUploadSuccess(false);
    setStatusMessage('Leyendo archivo...');
    console.log('📂 Archivo recibido:', file.name);

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const binaryStr = e.target?.result;
        if (!binaryStr) throw new Error("Error de lectura de archivo");

        let dataToUpload: NormalizedRow[] = [];

        if (uploadType === 'stock') {
           // CAMINO A: STOCK
           dataToUpload = await processStockFile(binaryStr);
        
        } else {
           // CAMINO B: DICCIONARIO
           console.log('📘 Modo Diccionario');
           // Llamamos a la función sin asignar variable inútil.
           await parseDictionaryCsv(); 
           
           // Stub para mantener compatibilidad hasta implementar lógica real de diccionario
           dataToUpload = []; 
        }

        console.log(`✅ Procesamiento Delegado Finalizado. Filas: ${dataToUpload.length}`);

        if (dataToUpload.length > 0) {
           // AUDITORÍA FINAL ANTES DE SUBIR
           const sample = dataToUpload[0];
           console.log('🔎 Muestra Blindada:', {
             sku: sample.sku,
             tiendaId: sample.tiendaId // <--- CONFIRMACIÓN VISUAL
           });

           // Validación de seguridad
           if (!sample.tiendaId || sample.tiendaId === 'undefined') {
             throw new Error("⛔ ALERTA: El parser devolvió datos sin tiendaId válido.");
           }

           setStatusMessage('Subiendo a la nube...');
           onUpload(dataToUpload, uploadType);
           setUploadSuccess(true);
           setStatusMessage('¡Carga completada con éxito!');
        } else if (uploadType === 'stock') {
           throw new Error("El parser no devolvió filas válidas.");
        }

      } catch (error: unknown) {
        // MANEJO DE ERRORES ROBUSTO (Sin 'any')
        console.error('❌ Error crítico en FileUpload:', error);
        
        let errorMessage = 'Fallo desconocido al procesar archivo';
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }

        setStatusMessage(`Error: ${errorMessage}`);
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
      {/* Selector de Tipo */}
      <div className="flex justify-center space-x-6 mb-4">
        <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition">
          <input 
            type="radio" name="uploadType" value="stock" 
            checked={uploadType === 'stock'} onChange={() => setUploadType('stock')}
            className="form-radio text-blue-600 h-4 w-4"
          />
          <span className={`font-medium ${uploadType === 'stock' ? 'text-blue-700' : 'text-gray-600'}`}>
            Carga de Stock (Info WX)
          </span>
        </label>
        <label className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition">
          <input 
            type="radio" name="uploadType" value="dictionary" 
            checked={uploadType === 'dictionary'} onChange={() => setUploadType('dictionary')}
            className="form-radio text-green-600 h-4 w-4"
          />
          <span className={`font-medium ${uploadType === 'dictionary' ? 'text-green-700' : 'text-gray-600'}`}>
            Diccionario de Productos
          </span>
        </label>
      </div>

      {/* Zona de Drop */}
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200 ease-in-out
          ${isDragActive ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}
          ${uploadSuccess ? 'bg-green-50 border-green-500' : ''}
          ${isUploading ? 'pointer-events-none opacity-80' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        {isUploading ? (
          <div className="flex flex-col items-center justify-center py-4">
             <div className="relative w-16 h-16 mb-4">
               <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-200 rounded-full opacity-25"></div>
               <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
             </div>
             <p className="text-lg font-semibold text-gray-700 animate-pulse">{statusMessage}</p>
          </div>
        ) : uploadSuccess ? (
          <div className="flex flex-col items-center animate-fade-in">
            <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3 text-3xl shadow-sm">✓</div>
            <p className="text-green-800 font-bold text-lg">¡Listo!</p>
            <p className="text-green-600 text-sm mt-1">Archivo procesado correctamente</p>
          </div>
        ) : (
          <div className="group">
            <div className="mb-4 transform group-hover:-translate-y-1 transition-transform duration-300">
               <span className="text-4xl">📄</span>
            </div>
            <p className="text-xl text-gray-600 mb-2 font-medium">Arrastra tu archivo aquí</p>
            <p className="text-sm text-gray-400">Soporta .xlsx, .xls y .csv</p>
          </div>
        )}
      </div>
    </div>
  );
}
