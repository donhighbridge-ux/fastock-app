import React from 'react';
import { useCart } from '../context/useCart';
import { useTrackingEngine, type ProcessedTrackingItem } from '../hooks/useTrackingEngine';
import type { NormalizedRow } from '../types';

const getTimestamp = () => Date.now();

interface TrackingListViewProps {
  data: NormalizedRow[]; // 🟢 Ahora recibe la data cruda para buscar las tallas
  currentStore: string;
}

export const TrackingListView: React.FC<TrackingListViewProps> = ({ data, currentStore }) => {
  const { trackingList, removeFromTracking, addToRequest } = useCart();
  
  // 1. Conectamos el Motor Logístico
  const { processedList } = useTrackingEngine(trackingList, data, currentStore);

  // 2. Agrupamos por Área (Igual que en el Carrito)
  const groupedItems = processedList.reduce((acc, item) => {
    const area = item.area || 'Sin Área';
    if (!acc[area]) acc[area] = [];
    acc[area].push(item);
    return acc;
  }, {} as Record<string, ProcessedTrackingItem[]>);

  // 3. Acción Mágica: Mover a Carrito
  const handleMoveToCart = (item: ProcessedTrackingItem) => {
    addToRequest({
      sku: item.sku,
      sizes: item.sizes,
      area: item.area,
      description: item.description,
      timestamp: getTimestamp(),
      originStore: item.originStore,
      requestType: 'stock'
    });
    removeFromTracking(item.sku, item.originStore);
  };

  // Renderizado de Vacío
  if (processedList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-gray-100 mt-6">
        <div className="text-gray-400 mb-4 text-5xl">👁️</div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Sin productos en seguimiento</h3>
        <p className="text-gray-500 text-center max-w-md">
          Añade productos sin stock desde el tablero principal para que el sistema te avise cuando lleguen al Centro de Distribución.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 mt-6">
      {Object.entries(groupedItems).map(([area, items]) => (
        <div key={area} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-800 uppercase tracking-wide">{area}</h3>
          </div>

          <div className="p-6">
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tallas En Seguimiento</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado Actual</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={`${item.sku}-${item.originStore}`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-gray-900">{item.sku}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 truncate max-w-xs">{item.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">{(item.sizes || []).join(', ')}</td>
                      
                      {/* El Semáforo Logístico */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {item.status === 'NADA EN EL CD' && (
                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                            Nada en el CD
                          </span>
                        )}
                        {item.status === 'EN CAMINO' && (
                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                            🚚 En Camino
                          </span>
                        )}
                        {item.status === 'SOLICITAR' && (
                          <button 
                            onClick={() => handleMoveToCart(item)}
                            className="px-4 py-1.5 inline-flex text-sm font-bold rounded-lg bg-green-600 hover:bg-green-700 text-white shadow-sm transition-colors cursor-pointer animate-pulse"
                          >
                            ➕ Solicitar
                          </button>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => removeFromTracking(item.sku, item.originStore)}
                          className="text-red-500 hover:text-red-700 hover:underline"
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
