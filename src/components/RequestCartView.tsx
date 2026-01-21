import React from 'react';
import { useCart, type CartItem } from '../context/CartContext';
import type { NormalizedRow } from '../types';

interface RequestCartViewProps {
  data: NormalizedRow[];
  currentStore: string | null;
}

const RequestCartView: React.FC<RequestCartViewProps> = ({ currentStore }) => {
  const { requestList, removeFromRequest } = useCart();

  const isGlobalView = !currentStore || currentStore === 'all' || currentStore === 'Todas las Tiendas';

  const filteredList = isGlobalView
    ? requestList
    : requestList.filter(item => item.originStore === currentStore);

  // Agrupar por Área
  const groupedItems = filteredList.reduce((acc, item) => {
    const area = item.area || 'Sin Área';
    if (!acc[area]) {
      acc[area] = [];
    }
    acc[area].push(item);
    return acc;
  }, {} as Record<string, CartItem[]>);

  const handleDownloadCSV = (area: string, items: CartItem[]) => {
    const headers = ['SKU', 'Descripción', 'Tallas Solicitadas', 'Área', 'Tienda Origen'];
    const rows = items.map(item => [
      item.sku,
      `"${item.description.replace(/"/g, '""')}"`, // Escapar comillas para CSV
      `"${item.sizes.join(', ')}"`,
      item.area,
      item.originStore || 'Global'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `solicitud_stock_${area}_${currentStore || 'global'}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (filteredList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg border border-dashed border-gray-300 p-8">
        <span className="text-4xl mb-4">🛒</span>
        <h3 className="text-lg font-medium text-gray-900">{isGlobalView ? 'Tu carrito de solicitud está vacío' : `No hay solicitudes pendientes para ${currentStore}`}</h3>
        <p className="text-gray-500">Agrega productos desde el Tablero cuando falte stock.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {Object.entries(groupedItems).map(([area, items]) => (
        <div key={area} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-800">{area} <span className="text-sm font-normal text-gray-500">({items.length} productos)</span></h3>
            <button
              onClick={() => handleDownloadCSV(area, items)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
            >
              📥 Descargar CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                  {isGlobalView && (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Origen</th>
                  )}
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tallas a Pedir</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={`${item.sku}-${item.originStore}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{item.sku}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.description}</td>
                    {isGlobalView && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">{item.originStore || 'Global'}</td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">{item.sizes.join(', ')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => removeFromRequest(item.sku, item.originStore)}
                        className="text-red-600 hover:text-red-900"
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
      ))}
    </div>
  );
};

export default RequestCartView;