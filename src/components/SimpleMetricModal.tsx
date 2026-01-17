import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface SimpleMetricModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  sku: string;
  metricLabel: string;
  data: { size: string; value: number }[]; // Fallback for single store
  isAggregatedView?: boolean;
  aggregatedData?: { store: string; total: number; sizes: { size: string; value: number }[] }[];
}

const SimpleMetricModal: React.FC<SimpleMetricModalProps> = ({
  isOpen,
  onClose,
  title,
  sku,
  metricLabel,
  data,
  isAggregatedView = false,
  aggregatedData = [],
}) => {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedStoreData, setSelectedStoreData] = useState<{ store: string; sizes: { size: string; value: number }[] } | null>(null);

  // Reset view when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setView('list');
      setSelectedStoreData(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Determine what to show based on view state and props
  const showAggregatedList = isAggregatedView && view === 'list';
  const currentData = (isAggregatedView && view === 'detail' && selectedStoreData) ? selectedStoreData.sizes : data;
  const currentTitle = (isAggregatedView && view === 'detail' && selectedStoreData) ? selectedStoreData.store : title;

  return createPortal(
    <div 
      className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      style={{ zIndex: 10001 }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-xs overflow-hidden relative transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-start bg-gray-50">
          <div>
            {view === 'detail' && isAggregatedView && (
              <button 
                onClick={() => setView('list')}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium mb-1 flex items-center gap-1 transition-colors"
              >
                ← Volver a tiendas
              </button>
            )}
            <h3 className="text-sm font-bold text-gray-900 leading-tight truncate pr-2">{currentTitle}</h3>
            <p className="text-xs font-mono text-gray-500 mt-0.5">{sku}</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Body */}
        <div className="p-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 text-center border-b border-gray-100 pb-2">
            {showAggregatedList ? "Desglose por Tienda" : metricLabel}
          </h4>
          
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {showAggregatedList ? (
              // VISTA 1: Lista de Tiendas (Aggregated)
              aggregatedData.length === 0 ? (
                <p className="text-center text-sm text-gray-400 italic py-2">Sin datos agrupados</p>
              ) : (
                aggregatedData.map((storeInfo, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => {
                      setSelectedStoreData({ store: storeInfo.store, sizes: storeInfo.sizes });
                      setView('detail');
                    }}
                    className="flex justify-between items-center text-sm hover:bg-blue-50 px-3 py-2 rounded-md cursor-pointer border border-transparent hover:border-blue-100 transition-all group"
                  >
                    <span className="font-medium text-gray-700 truncate max-w-[180px]" title={storeInfo.store}>{storeInfo.store}</span>
                    <span className="font-bold text-blue-600 bg-blue-50 group-hover:bg-white px-2 py-0.5 rounded-full text-xs transition-colors">{storeInfo.total}</span>
                  </div>
                ))
              )
            ) : (
              // VISTA 2: Lista de Tallas (Detail or Single Store)
              currentData.length === 0 ? (
              <p className="text-center text-sm text-gray-400 italic py-2">Sin datos disponibles</p>
            ) : (
              currentData.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm hover:bg-gray-50 px-2 py-1 rounded">
                  <span className="font-bold text-gray-700">{item.size}</span>
                  <span className="font-medium text-gray-900">{item.value}</span>
                </div>
              ))
            )
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SimpleMetricModal;