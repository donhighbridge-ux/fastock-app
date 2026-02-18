import React from 'react';
import type { GroupedProduct } from '../types';

interface StockRowProps {
  product: GroupedProduct;
  isMultiStore: boolean;
  onOpenModal: (group: GroupedProduct) => void;
  onSalesClick: (group: GroupedProduct) => void;
  onComparativeClick: (e: React.MouseEvent, group: GroupedProduct) => void;
}

const StockRow: React.FC<StockRowProps> = ({ 
  product, 
  isMultiStore, 
  onOpenModal, 
  onSalesClick, 
  onComparativeClick 
}) => {

  // Helper de color encapsulado (o importado si lo sacas a utils)
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETO': return "text-green-800 bg-green-100 border border-green-200 shadow-sm";
      case 'QUEDA POCO': return "text-yellow-800 bg-yellow-100 border border-yellow-200 shadow-sm";
      case 'INCOMPLETO': return "text-red-800 bg-red-100 border border-red-200 shadow-sm";
      default: return "text-gray-600 bg-gray-100 border border-gray-200";
    }
  };

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      
      {/* 1. SKU */}
      <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {product.baseSku.split('_')[0]}
        <div className="text-[10px] text-gray-400 font-normal">{product.baseSku.split('_')[1]}</div>
      </td>
      
      {/* 2. NOMBRE */}
      <td className="px-3 py-4 text-sm text-gray-500 max-w-xs truncate" title={product.name}>
        {product.name}
      </td>

      {/* 3. TIENDA */}
      {isMultiStore && (
        <td className="px-3 py-4 whitespace-nowrap text-center text-sm text-gray-500">
          {product.storeName || <span className="text-xs italic text-gray-400">Todas</span>}
        </td>
      )}

      {/* 4. DISPONIBILIDAD (Lógica Condicional Aislada) */}
      <td className="px-3 py-4 whitespace-nowrap text-center">
        {isMultiStore && !product.storeName ? (
          <button
            onClick={(e) => onComparativeClick(e, product)}
            className="inline-flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors shadow-sm"
          >
            <span className="mr-1">📊</span> Comparativo
          </button>
        ) : (
          <button
            onClick={() => onOpenModal(product)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-transform transform hover:scale-105 shadow-sm ${getStatusColor(product.health.status)}`}
          >
            {product.health.emoji} {product.health.status}
          </button>
        )}
      </td>

      {/* 5. VENTAS */}
      <td 
        onClick={() => onSalesClick(product)}
        className="px-3 py-4 whitespace-nowrap text-center text-sm text-gray-600 cursor-pointer hover:bg-gray-100 hover:text-blue-600 rounded"
      >
        {product.sales2w}
      </td>

      {/* 6. RA */}
      <td className="px-3 py-4 whitespace-nowrap text-center text-sm text-gray-500">
        {product.ra}
      </td>
    </tr>
  );
};

// React.memo hace que si la fila no cambió sus datos, no se vuelve a pintar
export default React.memo(StockRow);
