import React, { useState } from 'react';
import { uploadStoreLayout } from '../../services/layoutService';

interface LayoutUploaderProps {
  currentStore: string;
}

export const LayoutUploader: React.FC<LayoutUploaderProps> = ({ currentStore }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    // REGLA: Solo permitimos SVG para garantizar interactividad vectorial
    if (selectedFile && selectedFile.type === 'image/svg+xml') {
      setFile(selectedFile);
      setStatus(null);
      
      const reader = new FileReader();
      reader.onload = (event) => setPreview(event.target?.result as string);
      reader.readAsText(selectedFile);
    } else {
      setStatus({ type: 'error', msg: 'Por favor, sube un archivo SVG válido.' });
    }
  };

  const handleUpload = async () => {
    if (!file || !currentStore) return;

    setIsUploading(true);
    setStatus(null);

    try {
      await uploadStoreLayout(file, currentStore);
      setStatus({ type: 'success', msg: `¡Plano de ${currentStore} vinculado con éxito!` });
      setFile(null);
      setPreview(null);
    } catch (error) {
        console.error("[LayoutUploader] Error crítico en la subida:", error);
      setStatus({ type: 'error', msg: 'Error al subir el archivo. Revisa tu conexión.' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 animate-fade-in">
      <div className={`border-2 border-dashed rounded-2xl p-10 transition-all ${
        file ? 'border-purple-500 bg-purple-50' : 'border-gray-300 bg-gray-50'
      }`}>
        <input 
          type="file" 
          accept=".svg" 
          onChange={handleFileChange} 
          className="hidden" 
          id="svg-upload"
        />
        <label htmlFor="svg-upload" className="cursor-pointer flex flex-col items-center">
          <span className="text-5xl mb-4">{file ? '📄' : '📤'}</span>
          <p className="text-gray-700 font-bold">
            {file ? file.name : "Seleccionar Plano SVG"}
          </p>
          <p className="text-xs text-gray-400 mt-2 italic">Solo vectores compatibles con FASTOCK</p>
        </label>
      </div>

      {preview && (
        <div className="border-2 border-gray-100 rounded-xl p-4 bg-white shadow-inner max-h-48 overflow-hidden flex justify-center opacity-60 hover:opacity-100 transition-opacity">
          <div 
            className="w-full h-full pointer-events-none"
            dangerouslySetInnerHTML={{ __html: preview }} 
          />
        </div>
      )}

      {status && (
        <div className={`p-4 rounded-xl text-sm font-bold text-center animate-bounce ${
          status.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {status.msg}
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || isUploading}
        className="w-full bg-purple-700 hover:bg-purple-800 text-white font-black py-4 rounded-xl shadow-xl transition-all disabled:opacity-30 disabled:grayscale active:scale-95 flex justify-center items-center gap-2"
      >
        {isUploading ? '🚀 Procesando...' : `Vincular a ${currentStore}`}
      </button>
    </div>
  );
};
