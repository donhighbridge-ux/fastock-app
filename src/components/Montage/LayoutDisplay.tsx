import React, { useEffect, useState } from 'react';
import { useSectorDrawing } from '../../hooks/useSectorDrawing';
import { sectorService } from '../../services/sectorService';
import type { MontageToolType } from '../../types';
import { useRef } from 'react';
import { useZoomPan } from '../../hooks/useZoomPan';
import { getPolygonCentroid } from '../../utils/geometry';
import { SectorConfigModal } from './SectorConfigModal';
import type { StoreSector } from '../../types';
import { PlanogramWorkspace } from './PlanogramWorkspace';

interface LayoutDisplayProps {
  svgUrl: string;
  activeTool: MontageToolType;
  storeId: string;
  drawingConfig: ReturnType<typeof useSectorDrawing>;
}

export const LayoutDisplay: React.FC<LayoutDisplayProps> = ({ svgUrl, activeTool, storeId, drawingConfig }) => {
  const [svgContent, setSvgContent] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null); // ✅ Referencia para domar el mousepad
  const { scale, pan, handleZoomIn, handleZoomOut, handleResetZoom } = useZoomPan(containerRef);

  // Inicializamos el cerebro del dibujo
  const { sectors, currentPolygon, isDrawingActive, addPoint, undoLastPoint, redoLastPoint, cancelCurrentLine, setSectors } = drawingConfig;
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 }); 
  const isInitialLoad = useRef(true); // 🛡️ Sensor para evitar guardados fantasma

  // 🎨 Estado exclusivo de la paleta flotante pura
  const [strokeColor, setStrokeColor] = useState<string>('#a855f7');

  // ⌨️ Sensor de hardware para cambiar el cursor en tiempo real
  const [isAltPressed, setIsAltPressed] = useState<boolean>(false);

  // ⚙️ Estado de edición para el Modal de Configuración
  const [editingSector, setEditingSector] = useState<StoreSector | null>(null);

  // 📦 Estado de organización para el Lienzo del Planograma
  const [organizingSector, setOrganizingSector] = useState<StoreSector | null>(null);

  // ⌨️ Sensor de hardware universal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { 
      if (e.key === 'Alt') setIsAltPressed(true); 

      // ⏪ UNDO: Ctrl + Z (o Cmd + Z en Mac)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undoLastPoint();
      }
      // ⏩ REDO: Ctrl + Y  -O-  Ctrl + Shift + Z
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')) {
        e.preventDefault();
        redoLastPoint();
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => { 
      if (e.key === 'Alt') setIsAltPressed(false); 
      if (e.key === 'Backspace') undoLastPoint();
      if (e.key === 'Escape') cancelCurrentLine(); 
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [undoLastPoint, redoLastPoint, cancelCurrentLine]); // ✅ Dependencias actualizadas para el linter

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
            {sectors.map((sector) => {
              const center = getPolygonCentroid(sector.points);
              return (
                <g key={sector.id}>
                  <polygon
                    points={sector.points.map(p => `${p.x},${p.y}`).join(' ')}
                    fill={sector.color ? `${sector.color}33` : '#a855f733'} 
                    stroke={sector.color || '#a855f7'}
                    strokeWidth="4" strokeLinejoin="round"
                    className={`transition-all ${(activeTool === 'borrador' || isAltPressed) ? 'cursor-pointer hover:opacity-40 hover:stroke-red-500' : ''}`}
                    onClick={(e) => {
                      if (activeTool === 'borrador' || e.altKey) {
                        e.stopPropagation(); 
                        setSectors(prev => prev.filter(s => s.id !== sector.id));
                      }
                    }}
                  />
                  
                  {/* 🏷️ ETIQUETA Y BOTONES FLOTANTES (Ocultos si dibujas/borras) */}
                  {center && (
                    <foreignObject 
                      x={center.x - 75} y={center.y - 30} 
                      width="150" height="60" 
                      className={`overflow-visible transition-opacity duration-300 ${(activeTool === 'borrador' || activeTool === 'lineas') ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                    >
                      <div className="flex flex-col items-center justify-center w-full h-full">
                        {!sector.isConfigured ? (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setEditingSector(sector); }}
                            className="px-3 py-1.5 bg-white text-blue-600 hover:text-white hover:bg-blue-600 text-[11px] font-bold rounded-lg shadow-md border border-blue-200 transition-colors pointer-events-auto cursor-pointer"
                          >
                            ⚙️ Configurar Sector
                          </button>
                        ) : (
                          <div className="flex flex-col items-center gap-1.5 pointer-events-auto">
                            <span className="text-[11px] font-bold text-slate-800 bg-white/90 px-2 py-0.5 rounded shadow-sm backdrop-blur-sm border border-slate-200 text-center max-w-full truncate">
                              {sector.name}
                            </span>
                            <div className="flex gap-1">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setEditingSector(sector); }}
                              className="px-2 py-1 bg-white text-slate-600 text-[10px] font-bold rounded-md shadow-md hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer flex items-center justify-center"
                              title="Editar Paredes"
                            >
                              ⚙️
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setOrganizingSector(sector); }}
                              className="px-3 py-1 bg-slate-800 text-white text-[10px] font-bold rounded-md shadow-md hover:bg-slate-700 transition-colors cursor-pointer"
                            >
                              📦 Organizar
                            </button>
                          </div>
                          </div>
                        )}
                      </div>
                    </foreignObject>
                  )}
                </g>
              );
            })}

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
      {/* 🪟 INYECCIÓN DEL MODAL DE CONFIGURACIÓN */}
      {editingSector && (
        <SectorConfigModal
          sector={editingSector}
          onClose={() => setEditingSector(null)}
          onSave={(updatedSector) => {
            // 1. Actualizar el estado visual al instante
            setSectors((prev: StoreSector[]) => prev.map((s: StoreSector) => s.id === updatedSector.id ? updatedSector : s));
            
            // 2. Persistir el cambio en Firebase silenciosamente
            sectorService.saveSector(storeId, updatedSector).catch(console.error);
            
            // 3. Cerrar el modal
            setEditingSector(null);
          }}
        />
      )}
    {/* 📦 INYECCIÓN DEL PLANOGRAMA (CASCARÓN FRONTAL) */}
      {organizingSector && (
        <PlanogramWorkspace 
          sector={organizingSector}
          onClose={() => setOrganizingSector(null)}
        />
      )}
    </div>
  );
};
