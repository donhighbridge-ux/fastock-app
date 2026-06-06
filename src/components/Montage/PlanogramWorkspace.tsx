import React, { useState, useEffect } from 'react';
import type { StoreSector } from '../../types';
import { HardwareSidebar } from './HardwareSidebar';
import type { HardwareType } from '../../types';
import { PlanogramCanvas } from './PlanogramCanvas';

interface PlanogramWorkspaceProps {
  sector: StoreSector;
  onClose: () => void;
}

export const PlanogramWorkspace: React.FC<PlanogramWorkspaceProps> = ({ sector, onClose }) => {
  const [localSector, setLocalSector] = useState<StoreSector>(sector);
  const walls = localSector.wallsConfig || [];
  const [activeWallId, setActiveWallId] = useState<string | null>(walls[0]?.id || null);
  // 🧰 Memoria de la herramienta seleccionada
  const [activeHardware, setActiveHardware] = useState<HardwareType | null>(null);

  // 🛑 Sensor de la tecla ESC (Botón de pánico universal)
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const activeWall = walls.find(w => w.id === activeWallId);

  return (
    <div className="absolute inset-0 z-[200] bg-slate-100 flex flex-col animate-fade-in shadow-2xl">
      
      {/* 1. TOPBAR DEL PLANOGRAMA */}
      <div className="h-16 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            title="Volver al Mapa (ESC)"
          >
            ⬅️
          </button>
          <div>
            <h2 className="text-white font-bold text-lg leading-tight flex items-center gap-2">
              <span>📦</span> Organizando: {sector.name}
            </h2>
            <p className="text-slate-400 text-xs font-semibold tracking-wider">
              VISTA FRONTAL DE PLANOGRAMA
            </p>
          </div>
        </div>
        
        <div className="flex gap-3 items-center">
          <button className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-lg transition-colors shadow-lg">
            Guardar Diseño
          </button>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-400 text-xl transition-colors" title="Cerrar (ESC)">
            ✕
          </button>
        </div>
      </div>

      {/* 2. ZONA DE TRABAJO PRINCIPAL */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* 🧰 BARRA LATERAL DE HERRAMIENTAS (Independiente) */}
        <HardwareSidebar 
          activeTool={activeHardware} 
          onSelectTool={setActiveHardware} 
        />

        {/* LIENZO FRONTAL Y PESTAÑAS */}
        <div className="flex-1 flex flex-col bg-slate-50 relative">
          
          {/* Pestañas (Navegación entre muros) */}
          <div className="bg-white border-b border-slate-200 px-4 pt-3 flex gap-2 overflow-x-auto shrink-0 shadow-sm">
            {walls.map((wall, index) => (
              <button
                key={wall.id}
                onClick={() => setActiveWallId(wall.id)}
                className={`px-6 py-2.5 rounded-t-xl font-bold text-sm transition-all border-t border-x ${
                  activeWallId === wall.id 
                    ? 'bg-slate-50 text-purple-700 border-slate-200 border-b-transparent shadow-[0_4px_0_0_#f8fafc_absolute] z-10' 
                    : 'bg-slate-100 text-slate-500 border-transparent hover:bg-slate-200 hover:text-slate-700'
                }`}
              >
                {wall.type} <span className="text-xs opacity-50 ml-1">(Muro {index + 1})</span>
              </button>
            ))}
          </div>

          {/* EL PIZARRÓN MATEMÁTICO */}
          <div className="flex-1 overflow-auto p-8 flex items-center justify-center bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9IiNlMmU4ZjAiLz48L3N2Zz4=')]">
            
            {activeWall ? (
              <PlanogramCanvas 
                wall={activeWall}
                activeTool={activeHardware}
                onUpdateWall={(updatedWall) => {
                  // 🧠 Actualizamos la copia local de forma inmutable
                  const updatedWalls = walls.map(w => w.id === updatedWall.id ? updatedWall : w);
                  setLocalSector(prev => ({ ...prev, wallsConfig: updatedWalls }));
                }}
              />
            ) : (
              <div className="text-red-500 font-bold">No hay muros configurados.</div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};