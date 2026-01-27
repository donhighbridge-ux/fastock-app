import React, { useState } from 'react';
import type { GroupedProduct, StockStatus } from '../types'; // <--- Usamos el tipo procesado
// import { SmartTrackingModal } from './SmartTrackingModal'; // Comentado hasta que lo creemos
// import { SimpleMetricModal } from './SimpleMetricModal';   // Comentado hasta que lo creemos

interface TrackingListViewProps {
  currentData: GroupedProduct[]; // <--- EL CAMBIO CLAVE. Ya no es NormalizedRow.
  currentStore: string;
  sizeMap: Record<string, string>;
  onToggleStar: (sku: string) => void;
  starredSkus: Set<string>;
}

const getStatusColor = (status: StockStatus) => {
  switch (status) {
    case 'STOCK OK': return 'bg-green-100 text-green-800 border-green-200';
    case 'EN TRÁNSITO': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'PIDE SOLO...': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'NADA EN EL CD': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const TrackingListView: React.FC<TrackingListViewProps> = ({ 
  currentData, 
  currentStore, 
  // sizeMap, // Lo dejamos aquí por si se usa en los modales futuros
  onToggleStar,
  starredSkus
}) => {
  const [selectedItem, setSelectedItem] = useState<GroupedProduct | null>(null);
  
  // Placeholder simple para métricas hasta que reactivemos los modales
  const showMetric = (label: string, val: number) => alert(`${label}: ${val}`);

  if (!currentData || currentData.length === 0) {
    return <div className="p-8 text-center text-gray-500">No hay datos para mostrar.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">Tablero: {currentStore || 'Global'}</h2>
        <span className="text-sm text-gray-500">{currentData.length} SKUs</span>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Stock</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentData.map((row) => {
              // SIN ANY. TypeScript sabe que row es GroupedProduct y tiene .health
              const { health } = row; 
              
              return (
                <tr key={row.baseSku} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{row.name}</div>
                      <div className="text-xs text-gray-500">{row.baseSku}</div>
                    </div>
                  </td>

                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <span 
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(health.status)}`}
                    >
                      {health.emoji} {health.status}
                    </span>
                  </td>

                  <td className="px-4 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                    <div className="flex justify-center space-x-4">
                      <div className="cursor-pointer font-bold" onClick={() => showMetric('Stock Local', row.stock)}>
                        {row.stock} <span className="text-xs font-normal block">Loc</span>
                      </div>
                      
                      {row.transit > 0 && (
                        <div className="cursor-pointer text-orange-600 font-bold" onClick={() => showMetric('En Tránsito', row.transit)}>
                          +{row.transit} <span className="text-xs font-normal block">Viaje</span>
                        </div>
                      )}

                      {row.stock_cd > 0 && (
                        <div className="cursor-pointer text-purple-600 font-bold" onClick={() => showMetric('Stock CD', row.stock_cd)}>
                          {row.stock_cd} <span className="text-xs font-normal block">CD</span>
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <button 
                      onClick={() => onToggleStar(row.baseSku)}
                      className={`text-xl ${starredSkus.has(row.baseSku) ? 'text-yellow-400' : 'text-gray-300'}`}
                    >
                      ★
                    </button>
                    {/* Botón de análisis desactivado temporalmente hasta tener el modal */}
                    {/* <button onClick={() => setSelectedItem(row)} ... >Ver</button> */}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Aquí irían los modales cuando existan los archivos */}
    </div>
  );
};
