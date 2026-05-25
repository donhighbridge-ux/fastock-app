import React, { useState } from 'react';
import type { MontageFilterType, MontageToolType, DropdownOption } from '../../types';

interface MontageTopbarProps {
  currentStore: string | null | undefined;
  onStoreChange: (store: string) => void;
  selectedFilter: MontageFilterType;
  setSelectedFilter: React.Dispatch<React.SetStateAction<MontageFilterType>>;
  selectedTool: MontageToolType;
  setSelectedTool: React.Dispatch<React.SetStateAction<MontageToolType>>;
}

export const MontageTopbar: React.FC<MontageTopbarProps> = ({ 
  currentStore, 
  onStoreChange,
  selectedFilter,
  setSelectedFilter,
  selectedTool,
  setSelectedTool
}) => {
  // Estado local único para la apertura física de menús desplegables
  const [activeMenu, setActiveMenu] = useState<'filters' | 'tools' | null>(null);

  // Lista de tiendas dummy para el MVP (Las 8 tiendas que gestionará visual)
  const storesList = [
    "GAP VIÑA DEL MAR",
    "GAP COSTANERA CENTER",
    "GAP PARQUE ARAUCO",
    "GAP ALTO LAS CONDES",
    "GAP CONCEPCION",
    "GAP ANTOFAGASTA",
    "GAP PORTAL EL LLANO",
    "GAP MARINA ARAUCO"
  ];

  // Diccionarios con Emojis Nativos (Rápido, limpio y ligero)
  const filterOptions: DropdownOption<MontageFilterType>[] = [
    { id: 'venta', label: 'Venta Activa', emoji: '📈' },
    { id: 'stock', label: 'Stock en Sala', emoji: '📦' },
    { id: 'configuracion', label: 'Configuración', emoji: '⚙️' }
  ];

  const toolOptions: DropdownOption<MontageToolType>[] = [
    { id: 'lineas', label: 'Dibujar Líneas', emoji: '📐' },
    { id: 'mueble', label: 'Asignar Mueble', emoji: '🗄️' }
  ];

  const toggleDropdown = (menu: 'filters' | 'tools') => {
    setActiveMenu(prev => prev === menu ? null : menu);
  };

  return (
    <div className="w-full bg-slate-900 text-white px-6 py-4 flex justify-between items-center select-none shadow-md z-30 relative">
      
      {/* SECCIÓN IZQUIERDA: CONTROLADORES DROPDOWNS */}
      <div className="flex items-center gap-4">
        <h1 className="text-md font-black tracking-wider text-purple-400 mr-2">FASTOCK</h1>
        
        {/* DROPDOWN 1: FILTROS */}
        <div className="relative">
          <button 
            onClick={() => toggleDropdown('filters')}
            className={`w-48 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-between transition-all border ${
              selectedFilter ? 'bg-purple-950/50 border-purple-500 text-purple-300' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <span>{filterOptions.find(o => o.id === selectedFilter)?.emoji || '🔍'}</span>
              <span className="truncate">{filterOptions.find(o => o.id === selectedFilter)?.label || 'Filtros'}</span>
            </div>
            <span className="text-xs opacity-50 ml-1">▼</span>
          </button>

          {activeMenu === 'filters' && (
            <div className="absolute top-12 left-0 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
              {filterOptions.map(option => (
                <button
                  key={option.id}
                  onClick={() => {
                    setSelectedFilter(option.id);
                    setActiveMenu(null);
                    // Si activa configuración, por defecto selecciona 'lineas'
                    if (option.id === 'configuracion') {
                      setSelectedTool('lineas');
                      console.log(`[MontageTopbar] Modo Configuración activo. Herramienta por defecto: lineas`);
                    } else {
                      setSelectedTool(null); // Resetea herramientas en otros filtros
                    }
                  }}
                  className="w-full px-4 py-3 text-left text-sm font-semibold hover:bg-slate-700 transition-colors flex justify-between items-center border-b border-slate-700/50 last:border-0"
                >
                  <span>{option.label}</span>
                  <span className="text-lg">{option.emoji}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* DROPDOWN 2: HERRAMIENTAS */}
        <div className="relative">
          <button 
            disabled={selectedFilter !== 'configuracion'}
            onClick={() => toggleDropdown('tools')}
            className={`w-48 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-between transition-all border ${
              selectedFilter !== 'configuracion'
                ? 'bg-slate-800/40 border-slate-800/20 text-slate-500 opacity-30 grayscale pointer-events-none'
                : selectedTool 
                  ? 'bg-purple-950/50 border-purple-500 text-purple-300' 
                  : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <span>{toolOptions.find(o => o.id === selectedTool)?.emoji || '🛠️'}</span>
              <span className="truncate">{toolOptions.find(o => o.id === selectedTool)?.label || 'Herramientas'}</span>
            </div>
            <span className="text-xs opacity-50 ml-1">▼</span>
          </button>

          {activeMenu === 'tools' && (
            <div className="absolute top-12 left-0 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
              {toolOptions.map(option => (
                <button
                  key={option.id}
                  onClick={() => {
                    setSelectedTool(option.id);
                    setActiveMenu(null);
                    console.log(`[MontageTopbar] Herramientas: Contenedor '${option.id}' listo para recibir la lógica de dibujo.`);
                  }}
                  className="w-full px-4 py-3 text-left text-sm font-semibold hover:bg-slate-700 transition-colors flex justify-between items-center border-b border-slate-700/50 last:border-0"
                >
                  <span>{option.label}</span>
                  <span className="text-lg">{option.emoji}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN DERECHA: SELECTOR DE TIENDA DINÁMICO */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">Operando en:</span>
        <select
          value={currentStore || ''}
          onChange={(e) => onStoreChange(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-white px-4 py-2 rounded-xl text-sm font-black focus:outline-none focus:border-purple-500 cursor-pointer transition-colors hover:bg-slate-700"
        >
          <option value="" disabled>Seleccionar Tienda...</option>
          {storesList.map(store => (
            <option key={store} value={store} className="bg-slate-800 font-medium">
              📍 {store}
            </option>
          ))}
        </select>
      </div>

    </div>
  );
};
