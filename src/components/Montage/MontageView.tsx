import React from 'react';
import { useStoreLayout } from '../../hooks/useStoreLayout';
import { LayoutDisplay } from './LayoutDisplay';

import { MontageTopbar } from './MontageTopbar';

interface MontageViewProps {
  currentStore: string | null | undefined;
  onStoreChange: (store: string) => void;
}

export const MontageView: React.FC<MontageViewProps> = ({ currentStore, onStoreChange }) => {
  const { layout, loading, error } = useStoreLayout(currentStore);

  const isStoreSelected = currentStore && currentStore !== 'all' && currentStore !== 'Todas las Tiendas';

  return (
    <div className="w-full h-[calc(100vh-120px)] bg-slate-100 rounded-3xl border border-gray-200 shadow-xl overflow-hidden flex flex-col animate-fade-in">
      
      {/* 1. BARRA SUPERIOR DE COMANDOS (FASE 2) */}
      <MontageTopbar currentStore={currentStore} onStoreChange={onStoreChange} />

      {/* 2. LIENZO O AREA DE TRABAJO DINÁMICA */}
      <div className="flex-1 relative flex items-center justify-center p-6 overflow-auto">
        {!isStoreSelected && (
          <div className="text-center animate-pulse">
            <span className="text-6xl mb-4 block">📍</span>
            <p className="text-gray-400 font-bold">Selecciona una tienda para visualizar el plano físico.</p>
          </div>
        )}

        {isStoreSelected && loading && (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-700 rounded-full animate-spin mb-4"></div>
            <p className="text-purple-700 font-bold text-sm">Descargando vectores de tienda...</p>
          </div>
        )}

        {isStoreSelected && error && (
          <div className="text-center bg-red-50 p-8 rounded-2xl border-2 border-red-100">
            <span className="text-4xl mb-4 block">❌</span>
            <p className="text-red-700 font-bold">{error}</p>
            <p className="text-xs text-red-400 mt-2">Verifica que el plano esté subido en Configuración.</p>
          </div>
        )}

        {isStoreSelected && !loading && !error && layout && (
          <LayoutDisplay svgUrl={layout.svgUrl} />
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
