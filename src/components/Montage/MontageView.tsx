import React from 'react';
import { useStoreLayout } from '../../hooks/useStoreLayout';
import { LayoutDisplay } from './LayoutDisplay';

import { MontageTopbar } from './MontageTopbar';

import { useState } from 'react';
import type { MontageFilterType, MontageToolType } from '../../types';

interface MontageViewProps {
  currentStore: string | null | undefined;
  onStoreChange: (store: string) => void;
}

export const MontageView: React.FC<MontageViewProps> = ({ currentStore, onStoreChange }) => {
  const { layout, loading, error } = useStoreLayout(currentStore);

  // Estados compartidos para orquestar la Fase 3
  const [activeFilter, setActiveFilter] = useState<MontageFilterType>(null);
  const [activeTool, setActiveTool] = useState<MontageToolType>(null);

  const isStoreSelected = currentStore && currentStore !== 'all' && currentStore !== 'Todas las Tiendas';

  return (
    <div className="w-full h-[calc(100vh-120px)] bg-slate-100 rounded-3xl border border-gray-200 shadow-xl overflow-hidden flex flex-col animate-fade-in">
      
      {/* 1. BARRA SUPERIOR DE COMANDOS (FASE 2) */}
      <MontageTopbar 
        currentStore={currentStore} 
        onStoreChange={onStoreChange}
        selectedFilter={activeFilter}
        setSelectedFilter={setActiveFilter}
        selectedTool={activeTool}
        setSelectedTool={setActiveTool}
      />

      {/* 2. LIENZO O AREA DE TRABAJO DINÁMICA */}
      <div className="flex-1 relative flex items-center justify-center p-6 overflow-auto">
        {!isStoreSelected && (
          <div className="text-center p-8 bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm max-w-sm animate-pulse">
            <span className="text-5xl mb-3 block">📍</span>
            <p className="text-gray-500 font-bold text-sm">Consola de Montaje bloqueada.</p>
            <p className="text-xs text-gray-400 mt-1">Usa el selector de la barra superior para inicializar el plano.</p>
          </div>
        )}

        {isStoreSelected && loading && (
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-purple-600 rounded-full animate-spin mb-3"></div>
            <p className="text-slate-600 font-bold text-xs uppercase tracking-widest">Descargando vectores espaciales...</p>
          </div>
        )}

        {isStoreSelected && error && (
          <div className="text-center bg-red-50 px-8 py-6 rounded-2xl border border-red-200 shadow-sm max-w-md">
            <span className="text-3xl mb-2 block">❌</span>
            <p className="text-red-700 font-bold text-sm">{error}</p>
            <p className="text-xs text-red-400 mt-1">Verifica la existencia del archivo en el Centro de Comando.</p>
          </div>
        )}

        {isStoreSelected && !loading && !error && layout && (
          <LayoutDisplay 
            svgUrl={layout.svgUrl} 
            activeTool={activeTool}
            storeId={currentStore || ''}
          />
        )}

        {isStoreSelected && !loading && !error && !layout && (
          <div className="text-center opacity-40">
            <span className="text-6xl mb-4 block">🗺️</span>
            <p className="text-gray-500 font-bold">No se encontró un plano activo para esta tienda.</p>
          </div>
        )}
      </div>
    </div>
  );
};
