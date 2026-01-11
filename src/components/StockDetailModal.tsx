import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { NormalizedRow, StockHealth } from '../types';
import { useCart } from '../context/CartContext';

interface StockDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  variants: NormalizedRow[];
  health: StockHealth | null;
  sizeMap: Record<string, string>;
}

const StockDetailModal: React.FC<StockDetailModalProps> = ({ isOpen, onClose, variants, health, sizeMap }) => {
  const { addToRequest, addToTracking } = useCart();
  const [addedState, setAddedState] = useState<'request' | 'tracking' | null>(null);

  if (!isOpen || !health) return null;

  // Helper para estilos de estado
  const getStatusStyle = (s: string) => {
    if (s === 'NADA EN EL CD') return 'bg-red-100 text-red-800 border-red-200';
    if (s === 'EN TRÁNSITO') return 'bg-orange-100 text-orange-800 border-orange-200';
    if (s === 'PIDE SOLO...') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (s === 'STOCK OK') return 'bg-green-100 text-green-800 border-green-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Datos del producto
  const productTitle = variants[0]?.description || 'Producto Sin Nombre';
  const baseSku = variants[0]?.sku?.split('_')[0] || 'N/A';

  const handleAddToRequest = (tallas: string[]) => {
    addToRequest({
      sku: baseSku,
      sizes: tallas,
      area: variants[0]?.area || 'General',
      description: productTitle,
      timestamp: Date.now(),
    });
    setAddedState('request');
    setTimeout(() => setAddedState(null), 2000);
  };

  const handleAddToTracking = () => {
    addToTracking({
      sku: baseSku,
      description: productTitle,
      timestamp: Date.now(),
    });
    setAddedState('tracking');
    setTimeout(() => setAddedState(null), 2000);
  };

  // Renderizado de Mensajes Inteligentes
  const renderSmartMessage = () => {
    const { status, details } = health;

    // Bloque reutilizable para la solicitud (Botón Agregar)
    const renderRequestBlock = () => {
      if (details.request.length > 0) {
        return (
          <div className="bg-yellow-50 p-3 rounded border border-yellow-100 text-sm mt-2">
            <p className="text-yellow-800 mb-2 font-medium">
              {status === 'EN TRÁNSITO' 
                ? `Noté que no te enviaron la ${details.request.join(', ')}.` 
                : `Pide la ${details.request.join(', ')}.`}
            </p>
            <div className="flex items-center justify-between gap-3 mt-2">
              <p className="text-gray-600 text-xs">Agrégame a la lista de Solicitud Stock. Yo me encargo de generar el Excel.</p>
              <button 
                onClick={() => handleAddToRequest(details.request)}
                disabled={addedState === 'request'}
                className={`px-4 py-2 rounded font-bold transition-colors shadow-sm text-sm ${addedState === 'request' ? 'bg-green-600 text-white cursor-default' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                {addedState === 'request' ? '¡Agregado!' : 'Agregar'}
              </button>
            </div>
          </div>
        );
      }
      return null;
    };

    switch (status) {
      case 'STOCK OK':
        return <p className="text-gray-700">No es necesario que pidas nada, tienes el stock completito.</p>;
      
      case 'NADA EN EL CD':
        return <p className="text-gray-700">Lo siento, no hay nada para pedir.</p>;
      
      case 'EN TRÁNSITO':
        return (
          <div className="space-y-3 text-sm">
            {details.coming.length > 0 && (
              <p className="text-orange-800 font-medium">Viene en camino la {details.coming.join(', ')}.</p>
            )}
            {details.dead.length > 0 && (
              <p className="text-gray-600">No hay nada que hacer con la {details.dead.join(', ')}...</p>
            )}
            {renderRequestBlock()}
          </div>
        );

      case 'PIDE SOLO...':
        return renderRequestBlock();

      default:
        return null;
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)', // Fondo oscuro semitransparente
        zIndex: 9999, // Z-index nuclear para estar encima de todo
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(4px)'
      }}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all m-4 flex flex-col max-h-[90vh]"
        style={{ 
          backgroundColor: 'white', 
          position: 'relative', 
          zIndex: 10000,
          width: '100%',        // <--- ESTO le dice: "ocupa espacio"
          maxWidth: '600px',    // <--- ESTO es el freno de mano. Aquí decides el ancho.
          borderRadius: '10px'  // <--- Un extra para que se vea bonito
        }}
      >
        
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-gray-100 bg-white">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{productTitle}</h2>
            <p className="text-sm text-gray-500 mt-1 font-mono">SKU: {baseSku}</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Hero Badge */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">Estado del Inventario</span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusStyle(health.status)}`}>
            {health.emoji} {health.status}
          </span>
        </div>

        {/* Smart Content Area */}
        <div className="p-6 pb-2">
          {renderSmartMessage()}
        </div>

        {/* Footer con Seguimiento */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={handleAddToTracking}
            disabled={addedState === 'tracking'}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${addedState === 'tracking' ? 'bg-green-50 text-green-700 border-green-200' : 'border-gray-300 text-gray-700 hover:bg-white'}`}
          >
            {addedState === 'tracking' ? 'Siguiendo...' : 'Seguimiento'}
          </button>
        </div>

      </div>
    </div>
    , document.body
  );
};

export default StockDetailModal;