import React, { useMemo } from 'react';
import { useCart } from '../context/CartContext';
import type { NormalizedRow } from '../types';

interface TrackingListViewProps {
  currentData: NormalizedRow[];
}

const TrackingListView: React.FC<TrackingListViewProps> = ({ currentData }) => {
  const { trackingList, removeFromTracking } = useCart();

  // Lógica de Enriquecimiento, Clasificación y Agrupación
  const { actionableGroups, dormantGroups, actionableCount, dormantCount } = useMemo(() => {
    // 1. Enriquecimiento
    const processedItems = trackingList.map((item) => {
      // Buscar variantes en la data actual
      const variants = currentData.filter((d) => {
        const parts = d.sku.split('_');
        const base = parts.length >= 2 ? parts.slice(0, 2).join('_').toLowerCase() : d.sku.toLowerCase();
        return base === item.sku.toLowerCase();
      });

      const totalCD = variants.reduce((sum, v) => sum + (Number(v.stock_cd) || 0), 0);
      const totalTransit = variants.reduce((sum, v) => sum + (Number(v.transit) || 0), 0);
      const hasNews = totalCD > 0 || totalTransit > 0;
      
      // Determinar Área (usando la primera variante encontrada o 'Sin Información')
      const area = variants.length > 0 ? (variants[0].area || 'Sin Área') : 'Sin Información';

      let statusText = "SIN NOVEDADES";
      if (hasNews) {
        statusText = totalCD > 0 ? "DISPONIBLE EN CD" : "EN CAMINO";
      }

      return {
        ...item,
        totalCD,
        totalTransit,
        hasNews,
        area,
        statusText,
      };
    });

    // 2. Clasificación (Prioridad)
    const actionable = processedItems.filter((i) => i.hasNews);
    const dormant = processedItems.filter((i) => !i.hasNews);

    // 3. Agrupación por Área
    const groupByArea = (items: typeof processedItems) => {
      return items.reduce((acc, item) => {
        const key = item.area;
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      }, {} as Record<string, typeof processedItems>);
    };

    return {
      actionableGroups: groupByArea(actionable),
      dormantGroups: groupByArea(dormant),
      actionableCount: actionable.length,
      dormantCount: dormant.length,
    };
  }, [trackingList, currentData]);

  if (trackingList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg border border-dashed border-gray-300 p-8">
        <span className="text-4xl mb-4">👁️</span>
        <h3 className="text-lg font-medium text-gray-900">No estás siguiendo ningún producto</h3>
        <p className="text-gray-500">Usa el botón "Seguimiento" en el detalle de un producto para agregarlo aquí.</p>
      </div>
    );
  }

  const renderSection = (title: string, count: number, groups: Record<string, any[]>, isActionable: boolean) => {
    if (count === 0) return null;
    
    const areas = Object.keys(groups).sort();

    return (
      <div className={`mb-8 ${!isActionable ? 'opacity-75' : ''}`}>
        <div className={`flex items-center gap-3 mb-4 pb-2 border-b ${isActionable ? 'border-green-200' : 'border-gray-200'}`}>
          <h3 className={`text-xl font-bold ${isActionable ? 'text-green-800' : 'text-gray-600'}`}>
            {title}
          </h3>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${isActionable ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
            {count}
          </span>
        </div>

        <div className="space-y-6">
          {areas.map((area) => (
            <div key={area} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                <span className="font-bold text-gray-700">{area}</span>
                <span className="text-xs text-gray-500">{groups[area].length} productos</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-white">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">SKU</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">CD</th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Tránsito</th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Estado</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {groups[area].map((item: any) => (
                      <tr key={item.sku} className={isActionable ? "bg-green-50/30 hover:bg-green-50" : "hover:bg-gray-50"}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{item.sku}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.description}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-700">
                          {item.totalCD > 0 ? item.totalCD : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-orange-600">
                          {item.totalTransit > 0 ? item.totalTransit : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.hasNews 
                              ? 'bg-green-100 text-green-800 border border-green-200' 
                              : 'bg-gray-100 text-gray-600 border border-gray-200'
                          }`}>
                            {item.statusText}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => removeFromTracking(item.sku)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                          >
                            Dejar de seguir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-12">
      {/* Sección Prioritaria */}
      {renderSection("🎯 Oportunidades Detectadas", actionableCount, actionableGroups, true)}

      {/* Separador si hay ambas secciones */}
      {actionableCount > 0 && dormantCount > 0 && (
        <div className="border-t-2 border-dashed border-gray-200 my-8"></div>
      )}

      {/* Sección Secundaria */}
      {renderSection("💤 Sin Novedades", dormantCount, dormantGroups, false)}
    </div>
  );
};

export default TrackingListView;