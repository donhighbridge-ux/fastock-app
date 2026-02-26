import React from 'react';
import { useCart, type CartItem } from '../context/useCart';
import { useMagicSweep } from '../hooks/useMagicSweep'; // <-- IMPORTAMOS EL MOTOR
import type { NormalizedRow } from '../types';

interface RequestCartViewProps {
  data: NormalizedRow[];
  currentStore: string | null;
}

const RequestCartView: React.FC<RequestCartViewProps> = ({ data, currentStore }) => {
  // 1. Extraemos solo lo que la vista necesita del Carrito
  const { requestList, removeFromRequest, clearRequest } = useCart();

  // 2. Definimos si es vista global
  const isGlobalView = !currentStore || currentStore === 'all' || currentStore === 'Todas las Tiendas';

  // 3. ENCHUFAMOS EL MOTOR MÁGICO
  const { handleMagicSweep, sweepFeedback } = useMagicSweep(data, currentStore, isGlobalView);

  // 4. Filtros de la vista
  const filteredList = isGlobalView
    ? requestList
    : requestList.filter(item => item.originStore === currentStore);

  // Agrupar por Área
  const groupedItems = filteredList.reduce((acc, item) => {
    const area = item.area || 'Sin Área';
    if (!acc[area]) acc[area] = [];
    acc[area].push(item);
    return acc;
  }, {} as Record<string, CartItem[]>);

  // Función de confirmación para vaciar
  const handleClearCart = () => {
    const confirmMessage = isGlobalView 
      ? '⚠️ ATENCIÓN: Estás a punto de vaciar los pedidos de TODAS LAS TIENDAS. ¿Deseas continuar?'
      : `¿Estás seguro de vaciar todos los pedidos de ${currentStore}?`;
      
    if (window.confirm(confirmMessage)) {
      clearRequest(isGlobalView ? undefined : currentStore!);
    }
  };

  // (Temporal) Tu función actual de CSV, la cambiaremos a Excel pronto
  const handleDownloadCSV = (area: string, items: CartItem[]) => {
    const headers = ['SKU', 'Descripción', 'Tallas/RA', 'Tipo', 'Área', 'Tienda Origen'];
    const rows = items.map(item => {
      const isRa = item.requestType === 'ra';
      // Formatea el diccionario RA si existe, si no, usa las tallas
      const detail = isRa && item.proposedRaMap 
        ? Object.entries(item.proposedRaMap).map(([size, ra]) => `${size}:${ra}`).join(' | ')
        : item.sizes.join(', ');
      
      return [
        item.sku,
        `"${item.description.replace(/"/g, '""')}"`,
        `"${detail}"`,
        isRa ? 'Propuesta RA' : 'Solicitud Stock',
        item.area,
        item.originStore || 'Global'
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Solicitud_${area}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 mt-6">
      
      {/* 1. PANEL DE CONTROL SUPERIOR (AHORA ES PERMANENTE) */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            ⚡ Barrido Táctico
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Escanea todo el catálogo y auto-sugiere tallas con Stock Crítico (Menos de 2) que tienen respaldo en CD y no vienen en tránsito.
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <button
              onClick={handleClearCart}
              className="bg-white hover:bg-red-50 text-red-600 border border-red-200 font-bold py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center gap-2"
              disabled={filteredList.length === 0} // OPCIONAL: Deshabilita el botón de borrar si ya está vacío
            >
              🗑️ Vaciar Lista
            </button>
            
            <button
              onClick={handleMagicSweep}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow transition-colors flex items-center gap-2"
            >
              ⚡ Añadir Óptimos
            </button>
          </div>
          
          {sweepFeedback && (
            <span className={`text-sm font-medium mt-2 animate-pulse ${sweepFeedback.includes('Éxito') ? 'text-green-600' : 'text-gray-500'}`}>
              {sweepFeedback}
            </span>
          )}
        </div>
      </div>

      {/* 2. CONTENIDO DINÁMICO (TABLAS O MENSAJE DE VACÍO) */}
      {filteredList.length === 0 ? (
        // Pantalla de Carrito Vacío
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="text-gray-400 mb-4 text-5xl">🛒</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Tu carrito está vacío</h3>
          <p className="text-gray-500 text-center max-w-md">
            Aún no has añadido productos. Usa el botón de "Añadir Óptimos" arriba, o agrégalos manualmente desde el Dashboard.
          </p>
        </div>
      ) : (
        // Renderizado de las Tablas por Área
        Object.entries(groupedItems).map(([area, items]) => {
          const stockItems = items.filter(i => (i.requestType || 'stock') === 'stock');
          const raItems = items.filter(i => i.requestType === 'ra');

          return (
            <div key={area} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800 uppercase tracking-wide">{area}</h3>
                <button
                  onClick={() => handleDownloadCSV(area, items)}
                  className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 px-4 rounded-md font-medium transition-colors shadow-sm"
                >
                  Descargar CSV
                </button>
              </div>

              <div className="p-6 space-y-8">
                {/* TABLA 1: SOLICITUDES DE STOCK */}
                {stockItems.length > 0 && (
                  <div>
                    <h4 className="text-md font-bold text-blue-800 mb-3 flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-800 p-1 rounded">📦</span> 
                      Solicitudes de Envío de Stock
                    </h4>
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                            {isGlobalView && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tienda</th>}
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tallas Solicitadas</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {stockItems.map((item) => (
                            <tr key={`${item.sku}-${item.originStore}-stock`} className="hover:bg-blue-50/50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-gray-900">{item.sku}</td>
                              <td className="px-6 py-4 text-sm text-gray-600 truncate max-w-xs">{item.description}</td>
                              {isGlobalView && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.originStore}</td>}
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">{item.sizes.join(', ')}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                  onClick={() => removeFromRequest(item.sku, item.originStore, 'stock')}
                                  className="text-red-500 hover:text-red-700 hover:underline"
                                >
                                  Eliminar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TABLA 2: PROPUESTAS DE RA */}
                {raItems.length > 0 && (
                  <div>
                    <h4 className="text-md font-bold text-purple-800 mb-3 flex items-center gap-2">
                      <span className="bg-purple-100 text-purple-800 p-1 rounded">⚙️</span> 
                      Propuestas de Ajuste RA
                    </h4>
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                            {isGlobalView && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tienda</th>}
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nueva RA Propuesta</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {raItems.map((item) => (
                            <tr key={`${item.sku}-${item.originStore}-ra`} className="hover:bg-purple-50/50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-gray-900">{item.sku}</td>
                              <td className="px-6 py-4 text-sm text-gray-600 truncate max-w-xs">{item.description}</td>
                              {isGlobalView && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.originStore}</td>}
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <div className="flex gap-2">
                                  {item.proposedRaMap && Object.entries(item.proposedRaMap).map(([size, ra]) => (
                                    <span key={size} className="bg-purple-100 text-purple-800 px-2 py-1 rounded font-bold text-xs border border-purple-200">
                                      {size} ➔ {ra}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                  onClick={() => removeFromRequest(item.sku, item.originStore, 'ra')}
                                  className="text-red-500 hover:text-red-700 hover:underline"
                                >
                                  Eliminar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default RequestCartView;
