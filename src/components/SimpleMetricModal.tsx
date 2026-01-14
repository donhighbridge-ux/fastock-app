import React from 'react';
import { createPortal } from 'react-dom';

interface SimpleMetricModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  sku: string;
  metricLabel: string;
  data: { size: string; value: number }[];
}

const SimpleMetricModal: React.FC<SimpleMetricModalProps> = ({
  isOpen,
  onClose,
  title,
  sku,
  metricLabel,
  data,
}) => {
  if (!isOpen) return null;

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
            <h3 className="text-sm font-bold text-gray-900 leading-tight truncate pr-2">{title}</h3>
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
            {metricLabel}
          </h4>
          
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {data.length === 0 ? (
              <p className="text-center text-sm text-gray-400 italic py-2">Sin datos disponibles</p>
            ) : (
              data.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm hover:bg-gray-50 px-2 py-1 rounded">
                  <span className="font-bold text-gray-700">{item.size}</span>
                  <span className="font-medium text-gray-900">{item.value}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SimpleMetricModal;