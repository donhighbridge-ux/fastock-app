import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { NormalizedRow, StockStatus } from '../types';
import { getCleanSize } from '../utils/stockUtils';

interface StockDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  variants: NormalizedRow[];
  status: StockStatus;
  sizeMap: Record<string, string>;
}

const StockDetailModal: React.FC<StockDetailModalProps> = ({ isOpen, onClose, variants, status, sizeMap }) => {

  // 2. Lógica de cálculo (Siempre se ejecuta, incluso si está cerrado, es muy rápido)
  const { zeroStockSizes, lowStockSizes } = useMemo(() => {
    // Protección: Si no hay variantes, devolvemos arrays vacíos
    if (!variants) return { zeroStockSizes: [], lowStockSizes: [] };

    const zeros = variants
      .filter((v) => (Number(v.stock) || 0) === 0)
      .map((v) => getCleanSize(v.sku, sizeMap)); // USAMOS SKU, NO TALLA

    const lows = variants
      .filter((v) => (Number(v.stock) || 0) === 1)
      .map((v) => getCleanSize(v.sku, sizeMap)); // USAMOS SKU, NO TALLA

    return { zeroStockSizes: zeros, lowStockSizes: lows };
  }, [variants, sizeMap]);

  // 3. Renderizado Condicional (AHORA SÍ es seguro retornar)
  if (!isOpen) return null;

  console.log("🖥️ [DEBUG] Renderizando Modal. Variantes:", variants?.length, "Status:", status);
  console.log("📉 [DEBUG] Detalles calculados -> Zeros:", zeroStockSizes, "Lows:", lowStockSizes);

  // 4. Helper de renderizado de contenido
  const renderContent = () => {
    if (!variants || variants.length === 0) {
      return <p className="text-red-500 font-bold">⚠️ Error: No se encontraron variantes (Array vacío).</p>;
    }

    switch (status) {
      case 'COMPLETO':
        return <p className="text-green-700 font-medium">Nada que ver aquí, todo bien 😄</p>;
      case 'QUEDA POCO':
        return (
          <p>
            <span className="font-bold text-yellow-600">🟡 Queda 1 unidad de:</span>{' '}
            <span className="text-gray-700">{lowStockSizes.join(', ')}</span>
          </p>
        );
      case 'INCOMPLETO':
        return (
          <div className="space-y-3">
            {zeroStockSizes.length > 0 && (
              <p>
                <span className="font-bold text-red-600">🔴 Faltan:</span>{' '}
                <span className="text-gray-700">{zeroStockSizes.join(', ')}</span>
              </p>
            )}
            {lowStockSizes.length > 0 && (
              <p>
                <span className="font-bold text-yellow-600">🟡 Queda 1 unidad de:</span>{' '}
                <span className="text-gray-700">{lowStockSizes.join(', ')}</span>
              </p>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  // 5. El Portal
  return createPortal(
    <div
      // CAMBIO: Usamos estilos inline para GARANTIZAR visibilidad (bypass de Tailwind)
      style={{ 
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)', 
        zIndex: 2147483647 
      }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg relative m-4"
        // CAMBIO: Estilos forzados para el contenedor blanco
        style={{ 
            backgroundColor: 'white', 
            minWidth: '300px', 
            minHeight: '200px',
            border: '4px solid blue' // Borde de depuración para localizarlo
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">Detalle de Stock</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
             <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
             </svg>
          </button>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
          {renderContent()}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            className="inline-flex justify-center rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none shadow-md"
            onClick={onClose}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
    , document.body
  );
};

export default StockDetailModal;