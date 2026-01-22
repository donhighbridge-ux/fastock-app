import React from 'react';
import { useCart } from '../context/CartContext';
import type { NormalizedRow } from '../types';

interface TrackingListViewProps {
  currentData: NormalizedRow[];
  currentStore: string | null;
}

const TrackingListView: React.FC<TrackingListViewProps> = ({ currentData, currentStore }) => {
  const { trackingList, removeFromTracking } = useCart();

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
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU Base</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Stock CD Total</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Tránsito Total</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {trackingList.map((item) => {
              // Filtro robusto: Coincidencia de SKU base Y coincidencia exacta de nombre de tienda
              const variants = currentData.filter(d =>
                d.sku.toLowerCase().startsWith(item.sku.toLowerCase()) &&
                d.tiendaNombre === currentStore
              );

              // Calcular totales
              const totalCD = variants.reduce((sum, v) => sum + (Number(v.stock_cd) || 0), 0);
              const totalTransit = variants.reduce((sum, v) => sum + (Number(v.transit) || 0), 0);
              
              const isAvailable = totalCD > 0 || totalTransit > 0;

              return (
                <tr key={item.sku} className={isAvailable ? "bg-green-50" : ""}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{item.sku}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-700">{totalCD}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-orange-600">{totalTransit}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                    {isAvailable ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ¡Disponible!
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Sin Novedades
                      </span>
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
    </div>
  );
};

export default TrackingListView;