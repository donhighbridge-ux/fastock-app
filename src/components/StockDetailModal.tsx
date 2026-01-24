import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { NormalizedRow, StockHealth } from '../types';
import { useCart } from '../context/CartContext';

interface StockDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  variants: NormalizedRow[];
  health: StockHealth | null;
  sizeMap: Record<string, string>;
  currentStoreName?: string; // Prop recibida desde App -> StockTable
}

const StockDetailModal: React.FC<StockDetailModalProps> = ({ 
  isOpen, 
  onClose, 
  variants, 
  health, 
  sizeMap, 
  currentStoreName 
}) => {
  const { addToRequest, addToTracking, trackingList } = useCart();
  const [addedState, setAddedState] = useState<'request' | 'tracking' | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]); // Recuperamos selección de tallas para carrito
  const [confirmationPending, setConfirmationPending] = useState(false);

  // Resetear estado al abrir/cerrar
  useEffect(() => {
    if (!isOpen) {
      setConfirmationPending(false);
      setSelectedSizes([]);
    }
  }, [isOpen]);

  if (!isOpen || !health) return null;

  // --- 🔒 LÓGICA DE SEGURIDAD (Prompt 2) ---
  // Detectamos si estamos en "Todas las Tiendas" o sin tienda seleccionada
  const isReadOnlyMode = !currentStoreName || currentStoreName === 'all' || currentStoreName === 'Todas las Tiendas';
  // ----------------------------------------

  // Helper para estilos de estado (Visual Original)
  const getStatusStyle = (s: string) => {
    if (s === 'NADA EN EL CD') return 'bg-red-100 text-red-800 border-red-200';
    if (s === 'EN TRÁNSITO') return 'bg-orange-100 text-orange-800 border-orange-200';
    if (s === 'PIDE SOLO...') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (s === 'STOCK OK') return 'bg-green-100 text-green-800 border-green-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Datos del producto
  const productTitle = variants[0]?.description || 'Producto Sin Nombre';
  const groupSku = variants[0]?.sku?.split('_').slice(0, 2).join('_') || 'N/A';

  // Verificación de seguimiento (Solo chequea visualmente si ya lo sigues en ESTA tienda)
  const isTracked = trackingList.some(
    item => item.sku === groupSku && item.originStore === currentStoreName
  );

  const toggleSize = (size: string) => {
    setConfirmationPending(false); // Resetear confirmación al cambiar selección
    setSelectedSizes(prev => 
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  // --- HANDLERS PROTEGIDOS ---
  const handleAddToRequest = () => {
    if (isReadOnlyMode) return; // Bloqueo de seguridad
    if (selectedSizes.length === 0) return;

    // Advertencia de Contexto (Two-Step Confirmation)
    const riskyStatuses = ['NADA EN EL CD', 'STOCK OK', 'EN TRÁNSITO'];
    if (!confirmationPending && riskyStatuses.includes(health.status)) {
      setConfirmationPending(true);
      return;
    }

    addToRequest({
      sku: groupSku,
      sizes: selectedSizes,
      area: variants[0]?.area || 'General',
      description: productTitle,
      timestamp: Date.now(),
      originStore: currentStoreName! // Firmamos con la tienda
    });
    setAddedState('request');
    setSelectedSizes([]);
    setConfirmationPending(false);
    setTimeout(() => onClose(), 1000);
  };

  const handleAddToRequestFromSuggestion = (sizes: string[]) => {
    if (isReadOnlyMode) return; // Bloqueo de seguridad
    addToRequest({
      sku: groupSku,
      sizes: sizes,
      area: variants[0]?.area || 'General',
      description: productTitle,
      timestamp: Date.now(),
      originStore: currentStoreName! // Firmamos con la tienda
    });
    setAddedState('request');
    setTimeout(() => setAddedState(null), 2000);
  };

  const handleAddToTracking = () => {
    if (isReadOnlyMode) return; // Bloqueo de seguridad
    addToTracking({
      sku: groupSku,
      description: productTitle,
      timestamp: Date.now(),
      originStore: currentStoreName! // Firmamos con la tienda
    });
    setAddedState('tracking');
    setTimeout(() => onClose(), 1000);
  };

  // Renderizado de Mensajes Inteligentes (Visual Original preservada)
  const renderSmartMessage = () => {
    const { status, details } = health;

    // Bloque reutilizable para la solicitud automática
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
              <p className="text-gray-600 text-xs">Agrégame a la lista de Solicitud Stock.</p>
              <button
                onClick={() => handleAddToRequestFromSuggestion(details.request)}
                disabled={addedState === 'request' || isReadOnlyMode}
                className={`px-4 py-2 rounded font-bold transition-colors shadow-sm text-sm ${
                  isReadOnlyMode 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : addedState === 'request' ? 'bg-green-600 text-white cursor-default' : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
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
      case 'STOCK OK': return <p className="text-gray-700">No es necesario que pidas nada, tienes el stock completito.</p>;
      case 'NADA EN EL CD': return <p className="text-gray-700">Lo siento, no hay nada para pedir.</p>;
      case 'EN TRÁNSITO':
        return (
          <div className="space-y-3 text-sm">
            {details.coming.length > 0 && <p className="text-orange-800 font-medium">Viene en camino la {details.coming.join(', ')}.</p>}
            {details.dead.length > 0 && <p className="text-gray-600">No hay nada que hacer con la {details.dead.join(', ')}...</p>}
            {renderRequestBlock()}
          </div>
        );
      case 'PIDE SOLO...': return renderRequestBlock();
      default: return null;
    }
  };

  const getWarningMessage = () => {
    switch (health.status) {
      case 'NADA EN EL CD': return "⚠️ Estás pidiendo un producto que no tiene stock en el CD. ¿Deseas proceder?";
      case 'STOCK OK': return "⚠️ Estás pidiendo un producto que ya tienes. ¿Deseas proceder?";
      case 'EN TRÁNSITO': return "⚠️ Estás pidiendo un producto que ya tienes y con tallas faltantes en camino. ¿Deseas proceder?";
      default: return null;
    }
  };

  // --- RENDERIZADO CON PORTAL (Para que se vea encima de la tabla) ---
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col m-4 relative z-[10000]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{productTitle}</h2>
            <p className="text-sm text-gray-500 font-mono flex items-center gap-2">
              SKU: {groupSku}
              {/* Badge de Tienda */}
              <span className={`px-2 py-0.5 rounded text-xs border ${isReadOnlyMode ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                📍 {isReadOnlyMode ? 'Vista Global (Lectura)' : currentStoreName}
              </span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600">✕</button>
        </div>
        
        {/* Hero Badge */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">Estado del Inventario</span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusStyle(health.status)}`}>
            {health.emoji} {health.status}
          </span>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {renderSmartMessage()}

          {/* Selector Manual de Tallas */}
          <div className="mt-6">
             <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Selección Manual</h3>
             <div className="flex flex-wrap gap-2">
               {variants.map(v => {
                 const size = sizeMap[v.sku] || v.talla || 'U';
                 const isSelected = selectedSizes.includes(size);
                 return (
                   <button 
                     key={v.sku} 
                     onClick={() => toggleSize(size)}
                     className={`px-3 py-1 rounded border text-sm transition-all ${
                        isSelected 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                        : 'bg-white text-gray-600 hover:border-blue-400'
                     }`}
                   >
                     {size}
                   </button>
                 );
               })}
             </div>
          </div>
          
          {/* ⚠️ MENSAJE DE BLOQUEO VISIBLE */}
          {isReadOnlyMode && (
            <div className="mt-6 flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 text-sm">
              <span className="text-xl">🔒</span>
              <div>
                <p className="font-bold text-gray-800">Modo Lectura</p>
                <p>Para seguir productos o agregarlos al carrito, debes seleccionar una tienda específica en el filtro superior.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-col gap-3">
          {confirmationPending && (
            <div className="w-full p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm text-center animate-fade-in font-medium">
              {getWarningMessage()}
            </div>
          )}

          <div className="flex justify-between items-center gap-4 w-full">
            {/* Botón Seguir */}
            <button
            onClick={handleAddToTracking}
            disabled={isTracked || isReadOnlyMode}
            title={isReadOnlyMode ? "Selecciona una tienda" : "Seguir producto"}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                isReadOnlyMode 
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                : isTracked 
                    ? 'bg-green-50 text-green-700 border-green-200' 
                    : 'bg-white border-blue-200 text-blue-600 hover:bg-blue-50'
            }`}
          >
            {isTracked ? '✓ En Seguimiento' : '👁️ Seguir'}
          </button>

          {/* Botón Carrito */}
          <button
            onClick={handleAddToRequest}
            disabled={selectedSizes.length === 0 || isReadOnlyMode}
            className={`
              flex-1 px-6 py-2 rounded-lg text-sm font-bold shadow-sm transition-all
              ${isReadOnlyMode 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-70' 
                : confirmationPending
                  ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-md'
                  : selectedSizes.length > 0 
                      ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md' 
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {confirmationPending ? 'Confirmar Solicitud' : (selectedSizes.length > 0 ? `Solicitar ${selectedSizes.length} Talla(s)` : 'Selecciona tallas')}
          </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default StockDetailModal;