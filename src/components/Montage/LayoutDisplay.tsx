import React, { useEffect, useState } from 'react';

import { useSectorDrawing } from '../../hooks/useSectorDrawing';
import { sectorService } from '../../services/sectorService';
import type { MontageToolType } from '../../types';

interface LayoutDisplayProps {
  svgUrl: string;
  activeTool: MontageToolType;
  storeId: string;
}

export const LayoutDisplay: React.FC<LayoutDisplayProps> = ({ svgUrl, activeTool, storeId }) => {
  const [svgContent, setSvgContent] = useState<string>('');
  const [scale, setScale] = useState<number>(1); // 1 = 100% de tamaño original

  // Inicializamos el cerebro del dibujo
  const { lines, startPoint, addPoint, setLines } = useSectorDrawing();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 }); // Para la línea elástica temporal

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

  // Carga automática de la geometría guardada al inicializar la tienda
  useEffect(() => {
    const loadSavedGeometry = async () => {
      if (!storeId) return;
      try {
        const savedLines = await sectorService.getLines(storeId);
        // Sincronizamos las líneas recuperadas con el estado local del hook
        setLines(savedLines);
      } catch (error) {
        console.error('[LayoutDisplay] Error al recuperar líneas iniciales:', error);
      }
    };
    loadSavedGeometry();
  }, [storeId, setLines]);

  // Manejador del Click en la mesa de dibujo
  const handleCanvasClick = async (e: React.MouseEvent<SVGSVGElement>) => {
    if (activeTool !== 'lineas') return;

    const rect = e.currentTarget.getBoundingClientRect();
    // Calculamos el punto exacto escalado eliminando el factor del zoom
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    // Si startPoint existe, significa que este click va a CERRAR la línea
    const isClosingLine = startPoint !== null;
    const currentStartPoint = startPoint;

    addPoint(x, y);

    // Si cerramos la línea, gatillamos la persistencia asíncrona en Firestore
    if (isClosingLine && currentStartPoint) {
      const temporaryLineId = `line_${Date.now()}`;
      try {
        await sectorService.saveLine(storeId, {
          id: temporaryLineId,
          x1: currentStartPoint.x,
          y1: currentStartPoint.y,
          x2: x,
          y2: y
        });
      } catch (error) {
        console.error('[LayoutDisplay] Falló el guardado en la nube:', error);
      }
    }
  };

  // Captura el movimiento para la línea elástica en modo configuración
  const handleCanvasMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!startPoint || activeTool !== 'lineas') return;
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale
    });
  };

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

      {/* 🛠️ CONTENEDOR DESPLAZABLE (EL VIEWPORT DE TU CAPTURA) */}
      <div className="w-full h-full overflow-auto p-6 flex">
        
        {/* LIENZO VECTORIAL QUE SE EXPANDE FÍSICAMENTE SEGÚN EL ZOOM */}
        {/* El truco '[&_svg]:!w-full' obliga al XML incrustado a estirarse */}
        <div 
          className="drop-shadow-lg transition-all duration-200 ease-out select-none m-auto [&_svg]:!w-full [&_svg]:!h-full flex items-center justify-center"
          style={{ 
            width: `${100 * scale}%`, 
            height: `${100 * scale}%`,
            minWidth: '100%',
            minHeight: '100%',
          }}
        >  
          {/* Plano SVG original de fondo */}
          <div className="w-full h-full absolute inset-0 z-0" dangerouslySetInnerHTML={{ __html: svgContent }} />

          {/* 📐 CAPA DE DIBUJO GEOMÉTRICO (FASE 3) */}
          <svg 
            className={`absolute inset-0 w-full h-full z-10 ${activeTool === 'lineas' ? 'cursor-crosshair' : 'cursor-default'}`}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
          >
            {/* Dibujar las líneas consolidadas y persistidas */}
            {lines.map((line) => (
              <line
                key={line.id}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="#a855f7" // Color morado FASTOCK
                strokeWidth="3"
                strokeDasharray="6,6" // Efecto de línea punteada
                strokeLinecap="round"
              />
            ))}

            {/* Dibujar la línea "elástica" guía (Mientras el usuario busca el segundo click) */}
            {startPoint && activeTool === 'lineas' && (
              <line
                x1={startPoint.x}
                y1={startPoint.y}
                x2={mousePos.x}
                y2={mousePos.y}
                stroke="#c084fc" // Color púrpura claro guía
                strokeWidth="2"
                strokeDasharray="4,4"
              />
            )}
          </svg>

        </div>
      </div>
    </div>
  );
};
