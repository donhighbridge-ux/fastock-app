import React, { useEffect, useState } from 'react';
import { useSectorDrawing } from '../../hooks/useSectorDrawing';
import { sectorService } from '../../services/sectorService';
import type { MontageToolType } from '../../types';
import { useRef } from 'react';
import { useZoomPan } from '../../hooks/useZoomPan';

interface LayoutDisplayProps {
  svgUrl: string;
  activeTool: MontageToolType;
  storeId: string;
}

export const LayoutDisplay: React.FC<LayoutDisplayProps> = ({ svgUrl, activeTool, storeId }) => {
  const [svgContent, setSvgContent] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null); // ✅ Referencia para domar el mousepad
  const { scale, pan, handleZoomIn, handleZoomOut, handleResetZoom } = useZoomPan(containerRef);

  // Inicializamos el cerebro del dibujo
  const { sectors, currentPolygon, isDrawingActive, addPoint, undoLastPoint, setSectors } = useSectorDrawing();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 }); 
  const isInitialLoad = useRef(true); // 🛡️ Sensor para evitar guardados fantasma

  // 🎨 Estado exclusivo de la paleta flotante pura
  const [strokeColor, setStrokeColor] = useState<string>('#a855f7');

  // ⌨️ Sensor de hardware para cambiar el cursor en tiempo real
  const [isAltPressed, setIsAltPressed] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Alt') setIsAltPressed(true); };
    const handleKeyUp = (e: KeyboardEvent) => { 
      if (e.key === 'Alt') setIsAltPressed(false); 
      if (e.key === 'Backspace' || e.key === 'Escape') undoLastPoint(); // ⏪ El Deshacer en vivo
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [undoLastPoint]);

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
        setSectors(await sectorService.getSectors(storeId));
        setTimeout(() => { isInitialLoad.current = false; }, 500); // Marca fin de carga
      } catch (error) {
        console.error('[LayoutDisplay] Error:', error);
      }
    };
    loadSavedGeometry();
  }, [storeId, setSectors]);

  // 🚀 Auto-Guardado: Observador de la memoria local
  const prevSectorsCount = useRef(0);
  useEffect(() => {
    if (!isInitialLoad.current && sectors.length > prevSectorsCount.current) {
      const newSector = sectors[sectors.length - 1];
      sectorService.saveSector(storeId, newSector).catch(console.error);
    }
    prevSectorsCount.current = sectors.length;
  }, [sectors, storeId]);

  const handleCanvasClick = async (e: React.MouseEvent<SVGSVGElement>) => {
    // Permitir operar si la herramienta es líneas o el borrador explícito de barra superior
    if (activeTool !== 'lineas') return; // El borrador ahora vive en la misma capa visual
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    addPoint(x, y, strokeColor);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawingActive || activeTool !== 'lineas') return;
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

      {/* 🎨 PALETA DE COLORES FLOTANTE (SOLO EN MODO LÍNEAS) */}
      {activeTool === 'lineas' && (
        <div className="absolute top-6 left-6 z-20 bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-xl shadow-xl border border-slate-800 flex items-center gap-3 animate-fade-in text-white">
          <div className="flex flex-col select-none">
            <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">Paredes</span>
            <span className="text-xs font-black text-purple-400">Color</span>
          </div>
          <div className="w-px h-6 bg-slate-800" />
          <div className="flex items-center gap-2">
            {[
              { hex: '#a855f7', name: 'Morado FASTOCK' },
              { hex: '#3b82f6', name: 'Azul Denim' },
              { hex: '#ef4444', name: 'Rojo Alerta' },
              { hex: '#10b981', name: 'Verde Esmeralda' },
              { hex: '#f59e0b', name: 'Naranja Brillante'},
              { hex: '#6b7280', name: 'Gris Neutro'}
            ].map(color => (
              <button
                key={color.hex}
                onClick={() => setStrokeColor(color.hex)}
                className={`w-4 h-4 rounded-full border-2 transition-all transform active:scale-90 ${
                  strokeColor === color.hex ? 'border-white scale-110 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
                style={{ backgroundColor: color.hex }}
                title={color.name}
              />
            ))}
          </div>
        </div>
      )}

      {/* 🛠️ CONTENEDOR DESPLAZABLE (EL VIEWPORT DE TU CAPTURA) */}
      <div ref={containerRef} className="w-full h-full overflow-auto p-6 flex">
        
        {/* LIENZO VECTORIAL CON FILTRADO DE CURSOR DINÁMICO */}
        <div 
          className={`drop-shadow-lg transition-all duration-200 ease-out select-none m-auto flex items-center justify-center relative bg-transparent ${
            (activeTool === 'borrador' || isAltPressed) ? 'cursor-cell' : activeTool === 'lineas' ? 'cursor-crosshair' : 'cursor-default'
          }`}
          style={{
            width: `1200px`, // ✅ Suelo rígido absoluto para bloquear las coordenadas nativas
            height: `800px`,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, // ✅ Transformación unificada total
            transformOrigin: '0 0'
          }}
        >  
          {/* Plano SVG original de fondo enjaulado */}
          <div className="absolute inset-0 w-full h-full z-0 [&_svg]:w-full [&_svg]:h-full" dangerouslySetInnerHTML={{ __html: svgContent }} />

          {/* 📐 CAPA DE DIBUJO GEOMÉTRICO EN EL MISMO SUELO VIRTUAL */}
          <svg 
            className="absolute inset-0 w-full h-full z-10"
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
          >
            {/* 🏗️ 1. SECTORES CONSOLIDADOS (Con relleno semitransparente) */}
            {sectors.map((sector) => (
              <polygon
                key={sector.id}
                points={sector.points.map(p => `${p.x},${p.y}`).join(' ')}
                fill={sector.color ? `${sector.color}33` : '#a855f733'} // '33' es 20% de opacidad
                stroke={sector.color || '#a855f7'}
                strokeWidth="4" strokeLinejoin="round"
                className={`transition-all ${(activeTool === 'borrador' || isAltPressed) ? 'cursor-pointer hover:opacity-40 hover:stroke-red-500' : ''}`}
                onClick={(e) => {
                  if (activeTool === 'borrador' || e.altKey) {
                    e.stopPropagation(); // Evita dibujar un punto abajo al borrar
                    setSectors(prev => prev.filter(s => s.id !== sector.id));
                  }
                }}
              />
            ))}

            {/* 🚧 2. TRAZO EN VIVO (Cadena de puntos) */}
            {currentPolygon.length > 0 && (
              <polyline
                points={currentPolygon.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none" stroke={strokeColor} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
              />
            )}

            {/* 🧲 3. ELÁSTICO AL MOUSE Y PUNTO MAGNÉTICO */}
            {isDrawingActive && activeTool === 'lineas' && (
              <>
                <line 
                  x1={currentPolygon[currentPolygon.length - 1].x} y1={currentPolygon[currentPolygon.length - 1].y} 
                  x2={mousePos.x} y2={mousePos.y} 
                  stroke={strokeColor} strokeWidth="2" strokeDasharray="4,4" className="opacity-70" 
                />
                {currentPolygon.length >= 3 && (
                  <circle cx={currentPolygon[0].x} cy={currentPolygon[0].y} r="15" fill={strokeColor} className="animate-pulse opacity-50" />
                )}
              </>
            )}
          </svg>

        </div>
      </div>
    </div>
  );
};
