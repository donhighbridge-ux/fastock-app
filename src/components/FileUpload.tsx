// src/components/FileUpload.jsx
import React, { useState, useEffect, useRef } from 'react';
import Logger from '../utils/logger';
import { getAuth } from 'firebase/auth';
import { uploadStockBatch } from '../services/firebaseStockService';
import type { NormalizedRow } from '../utils/csvParserLogic';

const FileUpload = () => {
  const [jsonData, setJsonData] = useState<NormalizedRow[] | null>(null);
  const [error, setError] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Limpiamos el worker cuando el componente se desmonta
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files && event.target.files[0];
    
    if (file) {
      setIsParsing(true);
      setIsUploading(false);
      setError('');
      setJsonData(null);
      setUploadSuccess(false);

      // Sintaxis moderna de Vite para Web Workers. ¡Mucho más limpio!
      const worker = new Worker(new URL('../workers/csv.worker.js', import.meta.url), { type: 'module' });
      workerRef.current = worker;

      worker.onmessage = (e) => {
        const { type, payload } = e.data;

        if (type === 'COMPLETE') {
          setIsParsing(false);
          setIsUploading(true);
          setJsonData(payload);
          Logger.log('Datos Normalizados desde Worker:', payload);

          // TAREA 3: Llamar al servicio de subida
          // Asumimos un ID de organización estático por ahora
          const organizationId = 'komax_chile'; 
          const auth = getAuth();
          if (!auth.currentUser) {
            setError('Error: Debes iniciar sesión para subir archivos.');
            setIsUploading(false);
            return;
          }

          uploadStockBatch(payload, organizationId)
            .then(() => {
              setUploadSuccess(true);
              setIsUploading(false);
            })
            .catch((err) => {
              setError(`Error al subir a la nube: ${err.message}`);
              setIsUploading(false);
            });

        } else if (type === 'ERROR') {
          setError(`Hubo un error en el worker: ${payload}`);
          Logger.error(payload);
          setIsParsing(false);
        }
      };

      worker.onerror = (err) => {
        setError(`Error crítico en el worker: ${err.message}`);
        setIsParsing(false);
      };

      // Enviamos el archivo al worker para que inicie el procesamiento.
      worker.postMessage(file);
    }
  };

  return (
    <div>
      <h2>Subir y Normalizar Archivo de Stock</h2>
      <input type="file" accept=".csv" onChange={handleFileChange} disabled={isParsing || isUploading} />
      
      {isParsing && (
        <div>
          <p>Procesando archivo localmente...</p>
        </div>
      )}

      {isUploading && (
        <div>
          <p>✅ Archivo procesado. Subiendo a la nube...</p>
        </div>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      {uploadSuccess && <p style={{ color: 'green' }}>¡Datos subidos a la nube exitosamente!</p>}
      {jsonData && (
        <div>
          <h3>Procesamiento Exitoso</h3>
          <p>{jsonData.length} filas normalizadas generadas.</p>
          <p>Revisa la consola del navegador para ver los datos (solo en desarrollo).</p>
          <pre style={{ 
            background: '#f4f4f4', 
            padding: '10px', 
            maxHeight: '300px', 
            overflow: 'auto' 
          }}>
            {/* Slice seguro por si jsonData no es array */}
            {Array.isArray(jsonData) && JSON.stringify(jsonData.slice(0, 5), null, 2)}
            {Array.isArray(jsonData) && jsonData.length > 5 && '\n... y más.'}
          </pre>
        </div>
      )}
    </div>
  );
};

export default FileUpload;