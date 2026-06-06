import React from 'react';
import type { WallConfig, WallType, HardwareType, HardwareConfig } from '../../types';

// 🧬 Generador de IDs puro (Fuera del ciclo de renderizado)
const generateId = () => Math.random().toString(36).substring(2, 11);

interface PlanogramCanvasProps {
  wall: WallConfig;
  activeTool: HardwareType | null;
  onUpdateWall: (updatedWall: WallConfig) => void;
}

export const PlanogramCanvas: React.FC<PlanogramCanvasProps> = ({ wall, activeTool, onUpdateWall }) => {
  
  // 🧠 MOTOR FÍSICO: Proporción Áurea (3:5)
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

  // 🎯 El Francotirador: Calcula dónde hiciste clic y cuelga el fierro
  const handleColumnClick = (colIndex: number, event: React.MouseEvent<HTMLDivElement>) => {
    if (!activeTool) return;

    // 🛑 Regla Física: Los hijos no van en la pared
    if (activeTool === 'gancho_ropa' || activeTool === 'gancho_accesorio') {
      alert('⚠️ Los ganchos deben colocarse SOBRE un Fierro Plano, no directamente en la cremallera.');
      return;
    }

    // 📏 Calculamos la altura del clic (0% es el suelo, 100% es el techo)
    const rect = event.currentTarget.getBoundingClientRect();
    const clickY = event.clientY - rect.top;
    const heightPercent = 100 - ((clickY / rect.height) * 100);

    // Evitamos que pongan cosas en la zona muerta del zócalo (aprox los primeros 5-10%)
    if (heightPercent < 5) return;

    // 📦 Creamos el nuevo fierro
    const newHardware: HardwareConfig = {
      id: generateId(),
      type: activeTool,
      colIndex,
      verticalPosition: heightPercent,
      children: activeTool === 'fierro_plano' ? [] : undefined // Si es padre, nace con un arreglo vacío para sus futuros hijos
    };

    // 💾 Guardamos en la pared
    const updatedWall: WallConfig = {
      ...wall,
      hardware: [...(wall.hardware || []), newHardware]
    };

    onUpdateWall(updatedWall);
  };

  // 🎨 Diccionario de renderizado visual (Bloques temporales)
  const renderHardware = (hw: HardwareConfig) => {
    let bgColor = 'bg-blue-500';
    let height = 'h-3';
    let label = 'Fierro C';

    if (hw.type === 'repisa') {
      bgColor = 'bg-amber-600'; // Simula madera
      height = 'h-5';
      label = 'Repisa';
    } else if (hw.type === 'fierro_plano') {
      bgColor = 'bg-purple-600';
      height = 'h-2';
      label = 'Fierro Plano';
    }

    return (
      <div
        key={hw.id}
        className={`absolute w-full flex items-center justify-center border border-slate-900 shadow-md ${bgColor} ${height} cursor-pointer hover:brightness-110 transition-all group`}
        style={{ 
          bottom: `${hw.verticalPosition}%`, 
          transform: 'translateY(50%)' // Centra el fierro exactamente donde el cursor hizo clic
        }}
      >
        <span className="text-[8px] text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md">
          {label}
        </span>
      </div>
    );
  };

  return (
    <div 
      className="bg-white border-4 border-slate-800 w-full max-w-5xl h-[600px] shadow-xl relative grid"
      style={{ gridTemplateColumns: getGridTemplate(wall.type) }}
    >
      {Array.from({ length: columnCount }).map((_, colIndex) => (
        <div 
          key={colIndex} 
          className="h-full border-r-4 border-double border-slate-300 relative group"
          onClick={(e) => handleColumnClick(colIndex, e)}
        >
          {/* Zócalo Inferior */}
          <div className="absolute bottom-0 w-full h-8 bg-slate-200 border-t border-slate-300 flex items-center justify-center z-10 pointer-events-none">
            <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Zócalo</span>
          </div>

          {/* Sensor de Hover (Muestra un fondo tenue si tienes una herramienta en la mano) */}
          <div className={`absolute inset-0 bottom-8 transition-colors ${activeTool ? 'cursor-crosshair hover:bg-purple-50/50' : ''}`} />

          {/* 🧲 Renderizamos los fierros colgados en esta columna específica */}
          {wall.hardware?.filter(hw => hw.colIndex === colIndex).map(renderHardware)}
        </div>
      ))}
    </div>
  );
};
