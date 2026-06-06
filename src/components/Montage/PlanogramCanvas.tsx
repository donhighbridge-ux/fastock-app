import React, { useState } from 'react';
import type { WallConfig, WallType, HardwareType, HardwareConfig } from '../../types';

interface PlanogramCanvasProps {
  wall: WallConfig;
  activeTool: HardwareType | null;
  onUpdateWall: (updatedWall: WallConfig) => void;
}

// 🧬 Generador de IDs puro
const generateId = () => Math.random().toString(36).substring(2, 11);

export const PlanogramCanvas: React.FC<PlanogramCanvasProps> = ({ wall, activeTool, onUpdateWall }) => {
  // 📦 Estado para saber qué fierro estamos arrastrando en el aire
  const [draggedHardwareId, setDraggedHardwareId] = useState<string | null>(null);

  // 👻 Estado del Holograma de previsualización
  const [previewPos, setPreviewPos] = useState<{ colIndex: number; verticalPosition: number } | null>(null);

  // 🧒 Memoria de arrastre para los Fierros Hijos (Eje X)
  const [draggedChildInfo, setDraggedChildInfo] = useState<{ parentId: string; childId: string } | null>(null);

  const handleChildDragStart = (e: React.DragEvent, parentId: string, childId: string) => {
    e.stopPropagation();
    setDraggedChildInfo({ parentId, childId });
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleChildDragEnd = () => {
    setDraggedChildInfo(null);
  };

  const handleChildDrop = (hw: HardwareConfig, e: React.DragEvent<HTMLDivElement>) => {
    e.stopPropagation(); // Evita que la columna intercepte el drop
    if (!draggedChildInfo || draggedChildInfo.parentId !== hw.id) return; // Por ahora, solo permitimos deslizar en la misma barra

    const rect = e.currentTarget.getBoundingClientRect();
    const horizontalPercent = calculateWidthPercent(e.clientX, rect);

    const updatedHardware = (wall.hardware || []).map(h => {
      if (h.id === hw.id) {
        const updatedChildren = (h.children || []).map(c => 
          c.id === draggedChildInfo.childId ? { ...c, horizontalPosition: horizontalPercent } : c
        );
        return { ...h, children: updatedChildren };
      }
      return h;
    });

    onUpdateWall({ ...wall, hardware: updatedHardware });
    setDraggedChildInfo(null);
  };

  const getGridTemplate = (type?: WallType) => {
    switch (type) {
      case 'Pared Corta 1': return '3fr';
      case 'Pared Corta 2': return '3fr 3fr';
      case 'Pared Larga 1': return '5fr 5fr';
      case 'Pared Larga 2': return '5fr 5fr 5fr';
      case 'Pared Larga 3': return '5fr 5fr 5fr 5fr';
      case 'Pared Larga 4': return '5fr 5fr 5fr 5fr 5fr';
      case 'Pared Larga 5': return '5fr 5fr 5fr 5fr 5fr 5fr';
      case 'Pared Mixeada 1': return '3fr 5fr 3fr';
      default: return '1fr';
    }
  };

  const columnCount = getGridTemplate(wall.type).split(' ').length;

  // 🧲 FÍSICA CUÁNTICA (Snap): Calcula la altura y redondea a múltiplos de 5%
  const calculateHeightPercent = (clientY: number, containerRect: DOMRect) => {
    const clickY = clientY - containerRect.top;
    const rawPercent = 100 - ((clickY / containerRect.height) * 100);
    const clampedPercent = Math.max(0, Math.min(100, rawPercent));
    return Math.round(clampedPercent / 5) * 5; 
  };

  // 📏 FÍSICA HORIZONTAL: Calcula el Eje X relativo a la barra
  const calculateWidthPercent = (clientX: number, containerRect: DOMRect) => {
    const clickX = clientX - containerRect.left;
    const rawPercent = (clickX / containerRect.width) * 100;
    return Math.max(0, Math.min(100, rawPercent));
  };

  // 🛡️ MOTOR DE FÍSICAS: Detector de Colisión de Materia
  const checkCollision = (targetColIndex: number, targetHeight: number, ignoreId?: string) => {
    const HITBOX_MARGIN = 5; // 5% de margen vertical de exclusión mutua
    
    return (wall.hardware || []).some(hw => {
      // No comparamos al fierro contra sí mismo (útil para cuando arrastramos y soltamos)
      if (hw.id === ignoreId) return false;
      // Solo nos importa si chocan en la misma columna
      if (hw.colIndex !== targetColIndex) return false;
      
      // ¿Está el nuevo fierro dentro del campo de fuerza del fierro existente?
      return Math.abs(hw.verticalPosition - targetHeight) < HITBOX_MARGIN;
    });
  };

  // 🖱️ CLIC EN LA PARED: Crea un fierro nuevo
  const handleColumnClick = (colIndex: number, event: React.MouseEvent<HTMLDivElement>) => {
    if (!activeTool) return;

    if (activeTool === 'gancho_ropa' || activeTool === 'gancho_accesorio') {
      alert('⚠️ Los ganchos deben colocarse SOBRE un Fierro Plano (barra morada), no directamente en la pared.');
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const heightPercent = calculateHeightPercent(event.clientY, rect);

    if (heightPercent < 5) return; // Zócalo muerto

    // 🛑 Bloqueo por colisión física
    if (checkCollision(colIndex, heightPercent)) {
      alert('⚠️ Espacio ocupado. No puedes anclar un fierro tan cerca de otro.');
      return;
    }

    const newHardware: HardwareConfig = {
      id: generateId(),
      type: activeTool,
      colIndex,
      verticalPosition: heightPercent,
      children: activeTool === 'fierro_plano' ? [] : undefined
    };

    onUpdateWall({ ...wall, hardware: [...(wall.hardware || []), newHardware] });
  };

  // 🖱️ CLIC EN UN FIERRO: Borrar o Agregar Hijos
  const handleHardwareClick = (hw: HardwareConfig, e: React.MouseEvent) => {
    e.stopPropagation(); // 🛡️ Evita que el clic traspase a la pared y cree un duplicado

    // 1. Borrado Quirúrgico (ALT + Clic)
    if (e.altKey) {
      const newHardware = (wall.hardware || []).filter(h => h.id !== hw.id);
      onUpdateWall({ ...wall, hardware: newHardware });
      return;
    }

    // 2. Inyección de Hijos (Ganchos sobre Fierro Plano)
    if (activeTool === 'gancho_ropa' || activeTool === 'gancho_accesorio') {
      if (hw.type === 'fierro_plano') {

        // Calculamos la posición X exacta sobre la barra
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const horizontalPercent = calculateWidthPercent(e.clientX, rect);

        const newChild: HardwareConfig = {
          id: generateId(),
          type: activeTool,
          colIndex: hw.colIndex,
          verticalPosition: hw.verticalPosition,
          horizontalPosition: horizontalPercent
        };

        const updatedHardware = (wall.hardware || []).map(h => {
          if (h.id === hw.id) {
            return { ...h, children: [...(h.children || []), newChild] };
          }
          return h;
        });

        onUpdateWall({ ...wall, hardware: updatedHardware });
      } else {
        alert('⚠️ Este accesorio solo puede ir sobre un Fierro Plano.');
      }
    }
  };

  // 🖐️ DRAG & DROP: Iniciar movimiento
  const handleDragStart = (e: React.DragEvent, hw: HardwareConfig) => {
    e.stopPropagation();
    setDraggedHardwareId(hw.id);
    
    // Hack visual: Crea una imagen transparente para que no salga un "fantasma" feo de HTML5 al arrastrar
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  // 👻 Escáner Holográfico: Detecta por dónde pasas arrastrando
  const handleDragOver = (colIndex: number, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!draggedHardwareId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const heightPercent = calculateHeightPercent(e.clientY, rect);

    if (!previewPos || previewPos.colIndex !== colIndex || previewPos.verticalPosition !== heightPercent) {
      setPreviewPos({ colIndex, verticalPosition: heightPercent });
    }
  };

  // 🧹 Limpiador si se suelta el mouse fuera de la zona
  const handleDragEnd = () => {
    setDraggedHardwareId(null);
    setPreviewPos(null);
  };

  // 🖐️ DRAG & DROP: Soltar en nueva ubicación
  const handleDrop = (colIndex: number, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setPreviewPos(null); // Apagamos el holograma
    if (!draggedHardwareId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const heightPercent = calculateHeightPercent(e.clientY, rect);

    if (heightPercent < 5) return; // Zócalo

    // 🛑 Bloqueo por colisión física en destino
    if (checkCollision(colIndex, heightPercent, draggedHardwareId)) {
      alert('⚠️ Espacio ocupado en la zona de destino.');
      setDraggedHardwareId(null);
      return;
    }

    // Actualizamos la posición del fierro que estábamos arrastrando
    const updatedHardware = (wall.hardware || []).map(hw => {
      if (hw.id === draggedHardwareId) {
        return { ...hw, colIndex, verticalPosition: heightPercent };
      }
      return hw;
    });

    onUpdateWall({ ...wall, hardware: updatedHardware });
    setDraggedHardwareId(null);
  };

  const renderHardware = (hw: HardwareConfig) => {
    let bgColor = 'bg-blue-500';
    let height = 'h-3';
    let label = 'Fierro C';

    if (hw.type === 'repisa') {
      bgColor = 'bg-amber-600';
      height = 'h-5';
      label = 'Repisa';
    } else if (hw.type === 'fierro_plano') {
      bgColor = 'bg-purple-600';
      height = 'h-2';
      label = 'Fierro Plano';
    }

    const isDragging = draggedHardwareId === hw.id;

    return (
      <div
        key={hw.id}
        draggable // 👈 Magia HTML5: Permite mover el elemento
        onDragStart={(e) => handleDragStart(e, hw)}
        onDragEnd={handleDragEnd}
        onClick={(e) => handleHardwareClick(hw, e)}
        onDragOver={(e) => {
          if (draggedChildInfo) {
            e.preventDefault();
            e.stopPropagation(); // Evita que la columna dibuje su fantasma morado
          }
        }}
        onDrop={(e) => {
          if (draggedChildInfo) {
            e.preventDefault();
            handleChildDrop(hw, e);
          }
        }}

        className={`absolute w-full flex flex-col items-center justify-center border border-slate-900 shadow-md ${bgColor} ${height} cursor-grab active:cursor-grabbing hover:brightness-110 transition-all group ${isDragging ? 'opacity-30' : 'opacity-100'}`}
        style={{ 
          bottom: `${hw.verticalPosition}%`, 
          transform: 'translateY(50%)',
          zIndex: hw.type === 'fierro_plano' ? 20 : 10 // Los fierros planos van por encima para recibir clics
        }}
      >
        {/* Tooltip inteligente */}
        <span className="text-[8px] text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md pointer-events-none absolute -top-4 bg-slate-900/80 px-1 rounded">
          {label} (ALT+Clic = Borrar)
        </span>

        {/* 🧲 RENDERIZADO DE HIJOS CON EJE X LIBRE */}
        {hw.children && hw.children.length > 0 && (
          <div className="absolute top-full mt-0.5 w-full h-0 pointer-events-none">
            {hw.children.map(child => (
              <div 
                key={child.id}
                draggable
                onDragStart={(e) => handleChildDragStart(e, hw.id, child.id)}
                onDragEnd={handleChildDragEnd} 
                className={`absolute top-0 border border-slate-800 shadow-sm pointer-events-auto cursor-pointer ${child.type === 'gancho_ropa' ? 'bg-slate-700 w-2 h-4' : 'bg-slate-300 w-1 h-3'}`}
                title={child.type === 'gancho_ropa' ? 'Ropa Frente (ALT+Clic)' : 'Accesorio (ALT+Clic)'}
                style={{ 
                  left: `${child.horizontalPosition || 50}%`, // 👈 Obedece la coordenada X exacta
                  transform: 'translateX(-50%)' 
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (e.altKey) {
                    const updatedHw = { ...hw, children: hw.children?.filter(c => c.id !== child.id) };
                    const updatedHardware = (wall.hardware || []).map(h => h.id === hw.id ? updatedHw : h);
                    onUpdateWall({ ...wall, hardware: updatedHardware });
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      // Cursor nativo forzado para máxima precisión en fondos claros
      className="bg-white border-4 border-slate-800 w-full max-w-5xl h-[600px] shadow-xl relative grid cursor-crosshair"
      style={{ gridTemplateColumns: getGridTemplate(wall.type) }}
    >
      {Array.from({ length: columnCount }).map((_, colIndex) => (
        <div 
          key={colIndex} 
          className="h-full border-r-4 border-double border-slate-300 relative group"
          onClick={(e) => handleColumnClick(colIndex, e)}
          onDragOver={(e) => handleDragOver(colIndex, e)} 
          onDrop={(e) => handleDrop(colIndex, e)}
        >
          {/* Zócalo Inferior */}
          <div className="absolute bottom-0 w-full h-8 bg-slate-200 border-t border-slate-300 flex items-center justify-center z-0 pointer-events-none">
            <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Zócalo</span>
          </div>

          {/* 👻 FANTASMA VISUAL (Holograma de pre-anclaje) */}
          {previewPos && previewPos.colIndex === colIndex && draggedHardwareId && (
            <div 
              className="absolute w-full border-2 border-dashed border-purple-500 bg-purple-200/50 pointer-events-none z-30 transition-all duration-75"
              style={{ 
                height: '12px',
                bottom: `${previewPos.verticalPosition}%`, 
                transform: 'translateY(50%)' 
              }}
            />
          )}

          <div className={`absolute inset-0 bottom-8 transition-colors pointer-events-none ${activeTool ? 'group-hover:bg-purple-50/50' : ''}`} />

          {wall.hardware?.filter(hw => hw.colIndex === colIndex).map(renderHardware)}
        </div>
      ))}
    </div>
  );
};
