import React from 'react';
import { useCart, type CartItem } from '../context/useCart';
import { useMagicSweep } from '../hooks/useMagicSweep'; // <-- IMPORTAMOS EL MOTOR
import { useOpportunityHunter } from '../hooks/useOpportunityHunter';
import { generarReporteStock, generarReporteRA, generarReporteOportunidades } from '../utils/excel';
import type { NormalizedRow } from '../types';

interface RequestCartViewProps {
  data: NormalizedRow[];
  currentStore: string | null;
  productDictionary: Record<string, string>;
}

const RequestCartView: React.FC<RequestCartViewProps> = ({ data, currentStore, productDictionary }) => {
  // 1. Extraemos solo lo que la vista necesita del Carrito
  const { requestList, removeFromRequest, clearRequest } = useCart();

  // 2. Definimos si es vista global
  const isGlobalView = !currentStore || currentStore === 'all' || currentStore === 'Todas las Tiendas';

  // 3. ENCHUFAMOS EL MOTOR MÁGICO
  const { handleMagicSweep, sweepFeedback } = useMagicSweep(data, currentStore, isGlobalView, productDictionary);

  // 🟢 3.5. ENCHUFAMOS EL MOTOR CAZADOR
  const { huntOpportunities, hunterFeedback } = useOpportunityHunter(data, currentStore, productDictionary);

  // 4. Filtros de la vista
  const filteredList = isGlobalView
    ? requestList
    : requestList.filter(item => item.originStore === currentStore);

    // 4.5. Validadores de tipo de solicitud
  const hasStock = filteredList.some(item => (item.requestType || 'stock') === 'stock');
  const hasRA = filteredList.some(item => item.requestType === 'ra');
  const hasOpportunity = filteredList.some(item => item.requestType === 'opportunity'); // 🟢 NUEVO

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

  // Exportación a Excel - Módulo de Stock
  const handleDownloadStock = () => {
    const storeNameForExcel = currentStore && currentStore !== 'all' ? currentStore : 'Consolidado';
    generarReporteStock(requestList, data, storeNameForExcel);
  };

  // Exportación a Excel - Módulo de RA
  const handleDownloadRA = () => {
    const storeNameForExcel = currentStore && currentStore !== 'all' ? currentStore : 'Consolidado';
    generarReporteRA(requestList, data, storeNameForExcel);
  };

  // 🟢 NUEVO: Exportación a Excel - Módulo de Oportunidades
  const handleDownloadOpportunities = () => {
    const storeNameForExcel = currentStore && currentStore !== 'all' ? currentStore : 'Consolidado';
    const opportunityItems = requestList.filter(i => i.requestType === 'opportunity');
    generarReporteOportunidades(opportunityItems, data, storeNameForExcel); // 🟢 AHORA USA SU PROPIO EXCEL
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
          <div className="flex flex-wrap justify-end gap-2">
            <button
              onClick={handleClearCart}
              className="bg-white hover:bg-red-50 text-red-600 border border-red-200 font-bold py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center gap-2"
              disabled={filteredList.length === 0} // OPCIONAL: Deshabilita el botón de borrar si ya está vacío
            >
              🗑️ Vaciar Lista
            </button>
            
            <button
              onClick={handleMagicSweep}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow transition-colors flex items-center gap-2"
            >
              ⚡ Añadir Óptimos
            </button>

            {/* 🟢 NUEVO BOTÓN: CAZADOR */}
            <button
              onClick={huntOpportunities}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg shadow transition-colors flex items-center gap-2"
            >
              🎯 Cazar Oportunidades
            </button>
          
            {/* NUEVO BOTÓN: EXPORTAR STOCK */}
            <button
              onClick={handleDownloadStock}
              disabled={!hasStock}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold py-2 px-4 rounded-lg shadow transition-colors flex items-center gap-2"
            >
              📊 Excel Stock
            </button>

            {/* NUEVO BOTÓN: EXPORTAR RA */}
            <button
              onClick={handleDownloadRA}
              disabled={!hasRA}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white font-bold py-2 px-6 rounded-lg shadow transition-colors flex items-center gap-2"
            >
              🟣 Excel RA
            </button>

            {/* 🟢 NUEVO BOTÓN: EXCEL OPORTUNIDADES */}
            <button
              onClick={handleDownloadOpportunities}
              disabled={!hasOpportunity}
              className="bg-teal-800 hover:bg-teal-900 disabled:bg-gray-300 text-white font-bold py-2 px-4 rounded-lg shadow transition-colors flex items-center gap-2"
            >
              🎯 Excel Oportunidades
            </button>
          </div>
          
          {/* Mensajes de feedback dinámicos */}
          {(sweepFeedback || hunterFeedback) && (
            <span 
              className={`text-sm font-medium mt-2 animate-pulse ${
                sweepFeedback?.includes('Éxito') ? 'text-green-600' : 
                hunterFeedback?.includes('Exitosa') ? 'text-teal-600' : 
                'text-gray-500'
              }`}
            >
              {sweepFeedback || hunterFeedback}
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
          const opportunityItems = items.filter(i => i.requestType === 'opportunity'); // 🟢 NUEVO

          return (
            <div key={area} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800 uppercase tracking-wide">{area}</h3>
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

                {/* 🟢 TABLA 3: CAZADOR DE OPORTUNIDADES */}
                {opportunityItems.length > 0 && (
                  <div>
                    <h4 className="text-md font-bold text-teal-800 mb-3 flex items-center gap-2">
                      <span className="bg-teal-100 text-teal-800 p-1 rounded">🎯</span> 
                      Oportunidades Cazadas (Stock 0 en tienda, Alto en CD)
                    </h4>
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                            {isGlobalView && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tienda</th>}
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tallas Disponibles CD</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {opportunityItems.map((item) => (
                            <tr key={`${item.sku}-${item.originStore}-opp`} className="hover:bg-teal-50/50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-gray-900">{item.sku}</td>
                              <td className="px-6 py-4 text-sm text-gray-600 truncate max-w-xs">{item.description}</td>
                              {isGlobalView && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.originStore}</td>}
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-teal-600">{item.sizes.join(', ')}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                  onClick={() => removeFromRequest(item.sku, item.originStore, 'opportunity')}
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
