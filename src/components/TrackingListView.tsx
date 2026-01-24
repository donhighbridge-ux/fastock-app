import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import type { NormalizedRow } from '../types';
import SmartTrackingModal from './SmartTrackingModal';

interface TrackingListViewProps {
  currentData: NormalizedRow[];
  currentStore: string | null;
  sizeMap: Record<string, string>;
}

const TrackingListView: React.FC<TrackingListViewProps> = ({ currentData, currentStore, sizeMap }) => {
  const { trackingList, removeFromTracking } = useCart();
  const [activeModal, setActiveModal] = useState<{ isOpen: boolean; sku: string; mode: 'cd' | 'transit' | 'status' }>({
    isOpen: false,
    sku: '',
    mode: 'status'
  });

  const handleOpenCD = (sku: string) => {
    console.log('🔘 Click CD...', sku);
    setActiveModal({ isOpen: true, sku, mode: 'cd' });
  };

  const handleOpenTransit = (sku: string) => {
    console.log('🔘 Click Tránsito...', sku);
    setActiveModal({ isOpen: true, sku, mode: 'transit' });
  };

  const handleOpenStatus = (sku: string) => {
    console.log('🔘 Click Estado...', sku);
    setActiveModal({ isOpen: true, sku, mode: 'status' });
  };

  // Helper para filtrado estricto (Blindaje)
  const getFilteredVariants = (baseSku: string) => {
    const targetSku = baseSku.toLowerCase();
    const targetStore = currentStore?.trim();

    return currentData.filter(d => {
      const candidateSku = d.sku.toLowerCase();
      // SKU Token Match: Exact match OR starts with target + '_' (Evita GP1 vs GP10)
      const skuMatch = candidateSku === targetSku || candidateSku.startsWith(targetSku + '_');
      // Store Match: Strict trim comparison
      const storeMatch = d.tiendaNombre?.trim() === targetStore;
      return skuMatch && storeMatch;
    });
  };

  if (trackingList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg border border-dashed border-gray-300 p-8">
        <span className="text-4xl mb-4">👁️</span>
        <h3 className="text-lg font-medium text-gray-900">No estás siguiendo ningún producto</h3>
        <p className="text-gray-500">Usa el botón "Seguimiento" en el detalle de un producto para agregarlo aquí.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Stock CD Total</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Tránsito Total</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {trackingList.map((item) => {
              // Filtro robusto usando la función helper
              const variants = getFilteredVariants(item.sku);

              // Calcular totales con Normalización de Datos (Defensive Coding)
              const totalCD = variants.reduce((sum, v) => {
                const val = Number((v as any).stock_cd ?? (v as any).stockCD ?? 0);
                return sum + val;
              }, 0);
              const totalTransit = variants.reduce((sum, v) => {
                const val = Number((v as any).transit ?? (v as any).transito ?? 0);
                return sum + val;
              }, 0);

              // Visualización Limpia (SKU Formatter: ESTILO_COLOR)
              const displaySku = (variants[0]?.sku || item.sku).split('_').slice(0, 2).join('_');
              
              const isAvailable = totalCD > 0 || totalTransit > 0;

              return (
                <tr key={item.sku} className={isAvailable ? "bg-green-50" : ""}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{displaySku}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-700">
                    {totalCD > 0 ? (
                      <button onClick={() => handleOpenCD(item.sku)} className="text-blue-600 hover:underline decoration-dotted underline-offset-2">
                        {totalCD}
                      </button>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-orange-600">
                    {totalTransit > 0 ? (
                      <button onClick={() => handleOpenTransit(item.sku)} className="text-orange-600 hover:underline decoration-dotted underline-offset-2">
                        {totalTransit}
                      </button>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                    {totalCD > 0 ? (
                      <button onClick={() => handleOpenStatus(item.sku)} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 hover:scale-105 transition-transform shadow-sm animate-pulse">
                        ¡Llegaron Unidades!
                      </button>
                    ) : totalTransit > 0 ? (
                      <button onClick={() => handleOpenStatus(item.sku)} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 hover:scale-105 transition-transform shadow-sm">
                        En Tránsito
                      </button>
                    ) : (
                      <button onClick={() => handleOpenStatus(item.sku)} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                        Sin Novedades
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => removeFromTracking(item.sku)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Dejar de seguir
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {activeModal.isOpen && (
        <SmartTrackingModal
          isOpen={activeModal.isOpen}
          onClose={() => setActiveModal(prev => ({ ...prev, isOpen: false }))}
          variants={getFilteredVariants(activeModal.sku)}
          mode={activeModal.mode}
          currentStoreName={currentStore || 'Global'}
        />
      )}
    </div>
  );
};

export default TrackingListView;