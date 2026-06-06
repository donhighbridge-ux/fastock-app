import React, { useState } from 'react';
import type { StoreSector, WallConfig, WallType } from '../../types';

// 🧱 Tu catálogo oficial directamente inyectado a la interfaz
const WALL_CATALOG: WallType[] = [
  'Pared Corta 1', 'Pared Corta 2', 
  'Pared Larga 1', 'Pared Larga 2', 'Pared Larga 3', 'Pared Larga 4', 'Pared Larga 5', 
  'Pared Mixeada 1'
];

interface SectorConfigModalProps {
  sector: StoreSector;
  onSave: (updatedSector: StoreSector) => void;
  onClose: () => void;
}

export const SectorConfigModal: React.FC<SectorConfigModalProps> = ({ sector, onSave, onClose }) => {
  // 🧠 Memoria local temporal: No toca la base de datos hasta presionar "Guardar"
  const [name, setName] = useState(sector.name || '');
  const [walls, setWalls] = useState<WallConfig[]>(sector.wallsConfig || []);

  // ➕ Añadir un muro nuevo a la lista (Por defecto toma el primero del catálogo)
  const handleAddWall = () => {
    const newWall: WallConfig = {
      id: Date.now().toString(), // Generamos un ID único temporal
      type: 'Pared Corta 1'
    };
    setWalls([...walls, newWall]);
  };

  // ✏️ Actualizar el tipo de un muro específico
  const handleUpdateWall = (id: string, newType: WallType) => {
    setWalls(walls.map(w => w.id === id ? { ...w, type: newType } : w));
  };

  // 🗑️ Eliminar un muro de la lista
  const handleRemoveWall = (id: string) => {
    setWalls(walls.filter(w => w.id !== id));
  };

  // 🚀 El motor de guardado
  const handleSave = () => {
    const updatedSector: StoreSector = {
      ...sector,
      name: name.trim() !== '' ? name : sector.name,
      isConfigured: true, 
      wallsConfig: walls, // 🏢 Guardamos el batallón completo
    };
    onSave(updatedSector);
  };

  return (
    // 🪟 Capa de cristal que bloquea clics accidentales en el mapa
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      
      {/* 📦 Contenedor principal del Modal */}
      <div className="bg-white rounded-2xl shadow-2xl w-[420px] overflow-hidden border border-slate-200">
        
        {/* Cabecera */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            ⚙️ Configurar Sector
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors">
            ✕
          </button>
        </div>

        {/* Cuerpo del Formulario */}
        <div className="p-6 space-y-6">
          
          {/* 1. Identidad: Nombre del Sector */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">Nombre del Sector</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-700"
              placeholder="Ej: Sector 1"
              autoFocus
            />
          </div>

          {/* 2. Constructor Multimuro */}
          <div className="space-y-3">
            <div className="flex justify-between items-end mb-1">
              <label className="block text-sm font-semibold text-slate-700">Configuración de Paredes</label>
              <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                {walls.length} muro(s)
              </span>
            </div>

            {/* Lista Dinámica de Muros */}
            {walls.length === 0 ? (
              <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-300 rounded-lg">
                <p className="text-sm text-slate-400 font-medium">Este sector aún no tiene paredes.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {walls.map((wall, index) => (
                  <div key={wall.id} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-200 group">
                    <span className="text-xs font-bold text-slate-400 w-6 text-center">{index + 1}.</span>
                    <select
                      value={wall.type}
                      onChange={(e) => handleUpdateWall(wall.id, e.target.value as WallType)}
                      className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium text-slate-700 cursor-pointer"
                    >
                      {WALL_CATALOG.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    <button 
                      onClick={() => handleRemoveWall(wall.id)}
                      className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      title="Eliminar muro"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Botón para añadir más muros */}
            <button
              onClick={handleAddWall}
              className="w-full py-2.5 mt-2 border-2 border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-lg leading-none">+</span> Añadir otra pared
            </button>
          </div>

          {/* 3. Interior: Tipo de Mueble (Deshabilitado visualmente) */}
          <div className="space-y-2 opacity-40 cursor-not-allowed group">
            <label className="block text-sm font-semibold text-slate-700 group-hover:text-slate-500 transition-colors flex items-center justify-between">
              <span>Mobiliario Interior</span>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-full uppercase tracking-wider">
                Requiere dibujar mueble
              </span>
            </label>
            <select disabled className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-50 cursor-not-allowed text-slate-500">
              <option>Área vacía (Sin muebles detectados)</option>
            </select>
          </div>

        </div>

        {/* Pie de página: Botones de Acción */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-all"
          >
            Guardar Configuración
          </button>
        </div>
      </div>
    </div>
  );
};
