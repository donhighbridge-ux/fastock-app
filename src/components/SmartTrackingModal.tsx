import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { NormalizedRow } from '../types';
import { useCart } from '../context/CartContext';

interface SmartTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  variants: NormalizedRow[];
  mode: 'cd' | 'transit' | 'status';
  currentStoreName?: string;
}

const SmartTrackingModal: React.FC<SmartTrackingModalProps> = ({
  isOpen,
  onClose,
  variants,
  mode,
  currentStoreName
}) => {
  const { addToRequest } = useCart();
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [confirmationPending, setConfirmationPending] = useState(false);
  const [addedState, setAddedState] = useState<'request' | null>(null);

  // Resetear estado al abrir/cerrar o cambiar de modo
  useEffect(() => {
    if (isOpen) {
      console.log("SmartTrackingModal Open:", { mode, variantsCount: variants.length, variants });
      setConfirmationPending(false);
      setSelectedSizes([]);
      setAddedState(null);
    }
  }, [isOpen, mode, variants]);

  if (!isOpen || variants.length === 0) return null;

  const productTitle = variants[0]?.description || 'Producto Sin Nombre';
  const baseSku = variants[0]?.sku?.split('_')[0] || 'N/A';

  // Configuración visual y de comportamiento según el modo
  const getModeConfig = () => {
    switch (mode) {
      case 'cd':
        return {
          title: 'STOCK CD TOTAL',
          headerClass: 'bg-blue-50 text-blue-800 border-blue-100',
          badge: '🏭 CD',
          isActionable: false
        };
      case 'transit':
        return {
          title: 'TRÁNSITO TOTAL',
          headerClass: 'bg-orange-50 text-orange-800 border-orange-100',
          badge: '🚚 Tránsito',
          isActionable: false
        };
      case 'status':
        return {
          title: 'ESTADO / SOLICITUD',
          headerClass: 'bg-purple-50 text-purple-800 border-purple-100',
          badge: '⚡ Acción',
          isActionable: true
        };
      default:
        return {
          title: 'DETALLE',
          headerClass: 'bg-gray-50 text-gray-800 border-gray-100',
          badge: 'ℹ️ Info',
          isActionable: false
        };
    }
  };

  const config = getModeConfig();

  // Helper para obtener el valor correcto según el modo
  const getValue = (v: NormalizedRow) => {
    if (mode === 'transit') return Number(v.transit) || 0;
    // Para 'cd' y 'status' mostramos el stock del CD
    return Number(v.stock_cd) || 0;
  };

  const toggleSize = (size: string) => {
    if (!config.isActionable) return;
    setConfirmationPending(false); // Resetear confirmación al cambiar selección
    setSelectedSizes(prev =>
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  const handleAddToRequest = () => {
    if (selectedSizes.length === 0) return;

    // --- LÓGICA DE ADVERTENCIA DE CONTEXTO ---
    // Si el usuario pide una talla con stock 0 en CD, mostramos alerta.
    const hasZeroStockSelection = selectedSizes.some(size => {
      // Buscamos la variante correspondiente a la talla seleccionada
      const variant = variants.find(v => (v.size || v.talla) === size);
      if (!variant) return false;
      const val = Number(variant.stock_cd) || 0;
      return val === 0;
    });

    if (hasZeroStockSelection && !confirmationPending) {
      setConfirmationPending(true);
      return;
    }

    addToRequest({
      sku: baseSku,
      sizes: selectedSizes,
      area: variants[0]?.area || 'General',
      description: productTitle,
      timestamp: Date.now(),
      originStore: currentStoreName || 'General'
    });

    setAddedState('request');
    setSelectedSizes([]);
    setConfirmationPending(false);
    setTimeout(() => onClose(), 1000);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col m-4 relative z-[10000]">

        {/* Header */}
        <div className={`px-6 py-4 border-b flex justify-between items-center ${config.headerClass}`}>
          <div>
            <h2 className="text-xl font-bold">{config.title}</h2>
            <p className="text-sm opacity-80 font-mono flex items-center gap-2">
              SKU: {baseSku}
              <span className="px-2 py-0.5 rounded text-xs border bg-white/50 border-black/10">
                {config.badge}
              </span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">✕</button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
            {mode === 'transit' ? 'Unidades en Camino' : 'Disponibilidad en CD'}
          </h3>
          
          <div className="flex flex-wrap gap-2">
            {variants.map((v, idx) => {
              // Usamos v.size o v.talla como fallback
              const size = v.size || v.talla || 'U'; 
              const val = getValue(v);
              const isSelected = selectedSizes.includes(size);
              
              // Estilos de botón (Camaleón)
              let btnClass = "px-3 py-2 rounded border text-sm transition-all flex flex-col items-center min-w-[60px] ";
              
              if (config.isActionable) {
                if (isSelected) {
                  btnClass += "bg-blue-600 text-white border-blue-600 shadow-md cursor-pointer transform scale-105";
                } else {
                  btnClass += "bg-white text-gray-600 hover:border-blue-400 cursor-pointer hover:bg-blue-50";
                }
              } else {
                // Read-only styling
                btnClass += "bg-gray-50 text-gray-500 border-gray-200 cursor-default opacity-90";
              }

              return (
                <button
                  key={`${v.sku}-${idx}`}
                  onClick={() => toggleSize(size)}
                  disabled={!config.isActionable}
                  className={btnClass}
                  title={config.isActionable ? "Seleccionar" : "Solo lectura"}
                >
                  <span className="font-bold">{size}</span>
                  <span className="text-xs opacity-80">{val} u.</span>
                </button>
              );
            })}
          </div>

          {mode === 'status' && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100 text-sm text-blue-800 flex items-start gap-2">
              <span className="text-lg">💡</span>
              <p className="mt-0.5">Selecciona las tallas que deseas solicitar. Si pides tallas sin stock en CD, se te pedirá confirmación.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-col gap-3">
          {confirmationPending && (
            <div className="w-full p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm text-center animate-fade-in font-medium">
              ⚠️ Estás pidiendo tallas que figuran con 0 stock en CD. ¿Deseas proceder?
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
            >
              Cerrar
            </button>

            {config.isActionable && (
              <button
                onClick={handleAddToRequest}
                disabled={selectedSizes.length === 0}
                className={`
                  px-6 py-2 rounded-lg text-sm font-bold shadow-sm transition-all
                  ${confirmationPending
                    ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-md'
                    : selectedSizes.length > 0
                      ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                {confirmationPending ? 'Confirmar Solicitud' : (addedState === 'request' ? '¡Solicitado!' : 'Solicitar')}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default SmartTrackingModal;