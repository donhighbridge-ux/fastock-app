import React from 'react';
import type { HardwareType } from '../../types';

interface HardwareSidebarProps {
  activeTool: HardwareType | null;
  onSelectTool: (tool: HardwareType | null) => void;
}

// 🧰 El catálogo visual
const HARDWARE_CATALOG: { type: HardwareType; icon: string; label: string; category: string }[] = [
  { type: 'fierro_c', icon: '◳', label: 'Fierro C', category: 'Independiente' },
  { type: 'repisa', icon: '🗂️', label: 'Repisa', category: 'Macro' },
  { type: 'fierro_plano', icon: '➖', label: 'Fierro Plano', category: 'Padre' },
  { type: 'gancho_ropa', icon: '📍', label: 'Ropa Frente', category: 'Hijo' },
  { type: 'gancho_accesorio', icon: '📎', label: 'Accesorio', category: 'Hijo' },
];

export const HardwareSidebar: React.FC<HardwareSidebarProps> = ({ activeTool, onSelectTool }) => {
  return (
    <div className="w-20 bg-white border-r border-slate-200 flex flex-col items-center py-4 shadow-sm z-10 shrink-0 overflow-y-auto">
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center leading-tight mb-4 px-2">
        Catálogo
      </div>
      
      <div className="flex flex-col gap-2 w-full px-2">
        {HARDWARE_CATALOG.map((item) => {
          const isSelected = activeTool === item.type;
          const isChild = item.category === 'Hijo';
          
          return (
            <button
              key={item.type}
              onClick={() => onSelectTool(isSelected ? null : item.type)} // Clic para seleccionar, clic de nuevo para soltar
              className={`flex flex-col items-center justify-center py-3 px-1 rounded-xl transition-all border-2 relative group ${
                isSelected 
                  ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm' 
                  : 'border-transparent hover:bg-slate-50 text-slate-500 hover:text-slate-800'
              }`}
              title={item.label}
            >
              <span className="text-2xl mb-1 drop-shadow-sm">{item.icon}</span>
              <span className="text-[9px] font-extrabold text-center leading-tight tracking-tight">
                {item.label}
              </span>
              
              {/* Etiqueta visual para distinguir los que van en pared vs los que van en fierro plano */}
              {isChild && (
                <span className="absolute -top-1 -right-1 bg-amber-100 text-amber-700 text-[8px] font-bold px-1 rounded-sm border border-amber-200">
                  HIJO
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
