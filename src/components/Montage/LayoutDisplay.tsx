import React, { useEffect, useState } from 'react';

interface LayoutDisplayProps {
  svgUrl: string;
}

export const LayoutDisplay: React.FC<LayoutDisplayProps> = ({ svgUrl }) => {
  const [svgContent, setSvgContent] = useState<string>('');

  const [scale, setScale] = useState<number>(1); // 1 = 100% de tamaño original

  const handleZoomIn = () => {
    setScale(prev => {
      const next = Math.min(prev + 0.2, 3); // Cap máximo de 300%
      console.log(`[LayoutDisplay] Zoom In ejecutado: ${Math.round(next * 100)}%`);
      return next;
    });
  };

  const handleZoomOut = () => {
    setScale(prev => {
      const next = Math.max(prev - 0.2, 0.5); // Cap mínimo de 50%
      console.log(`[LayoutDisplay] Zoom Out ejecutado: ${Math.round(next * 100)}%`);
      return next;
    });
  };

  const handleResetZoom = () => {
    console.log(`[LayoutDisplay] Zoom restablecido al 100%`);
    setScale(1);
  };

  useEffect(() => {
    const loadSvg = async () => {
      try {
        const response = await fetch(svgUrl);
        const text = await response.text();
        setSvgContent(text);
      } catch (err) {
        console.error("[LayoutDisplay] Error inyectando SVG:", err);
      }
    };
    loadSvg();
  }, [svgUrl]);

  return (
    <div className="w-full h-full flex items-center justify-center p-4 relative overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-inner">
      
      {/* CONTROLES FLOTANTES DE NAV (UI LIMPIA Y MODERNA) */}
      <div className="absolute bottom-6 right-6 flex gap-2 z-20 bg-white/90 backdrop-blur-md p-2 rounded-xl shadow-lg border border-gray-200/60">
        <button 
          onClick={handleZoomOut}
          className="w-10 h-10 flex items-center justify-center bg-white hover:bg-gray-50 text-gray-700 font-bold rounded-lg border border-gray-200 shadow-sm active:scale-95 transition-all text-lg"
          title="Alejar"
        >
          ➖
        </button>
        <button 
          onClick={handleResetZoom}
          className="px-3 h-10 flex items-center justify-center bg-white hover:bg-gray-50 text-gray-500 font-black rounded-lg border border-gray-200 shadow-sm active:scale-95 transition-all text-xs tracking-tighter"
          title="Restablecer original"
        >
          {Math.round(scale * 100)}%
        </button>
        <button 
          onClick={handleZoomIn}
          className="w-10 h-10 flex items-center justify-center bg-white hover:bg-gray-50 text-gray-700 font-bold rounded-lg border border-gray-200 shadow-sm active:scale-95 transition-all text-lg"
          title="Acercar"
        >
          ➕
        </button>
      </div>

      {/* LIENZO VECTORIAL INTERACTIVO */}
      <div 
        className="max-w-full max-h-full drop-shadow-md transition-transform duration-200 ease-out"
        style={{ 
          width: '100%', 
          height: '100%',
          transform: `scale(${scale})`,
          transformOrigin: 'center center' // Zoom centrado para evitar desorientación
        }}
        dangerouslySetInnerHTML={{ __html: svgContent }} 
      />
    </div>
  );
};
