import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { GroupedProduct, NormalizedRow } from '../types';
import { findSubstitutes } from '../utils/substitutionEngine';

interface SubstitutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetProduct: GroupedProduct | null;
  localGroupedProducts: GroupedProduct[];
  rawAllData: NormalizedRow[];
}

const SubstitutionModal: React.FC<SubstitutionModalProps> = ({
  isOpen,
  onClose,
  targetProduct,
  localGroupedProducts,
  rawAllData
}) => {

  // Ejecutamos el motor de inteligencia solo cuando se abre el modal
  const { ideales, alternativos } = useMemo(() => {
    if (!targetProduct) return { ideales: [], alternativos: [] };
    return findSubstitutes(targetProduct, localGroupedProducts, rawAllData);
  }, [targetProduct, localGroupedProducts, rawAllData]);

    if (!isOpen || !targetProduct) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="bg-indigo-700 p-4 flex justify-between items-center text-white">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span>🔄</span> Inteligencia de Exhibición
            </h2>
            <p className="text-sm opacity-90 mt-1">
              Buscando reemplazo para: <strong>{targetProduct.baseSku}</strong> ({targetProduct.categoria})
            </p>
          </div>
          <button onClick={onClose} className="text-white hover:text-indigo-200 text-3xl font-bold leading-none">&times;</button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
          
          {/* SECCIÓN 1: SUPLENTES IDEALES */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4 flex items-center gap-2">
              <span className="text-green-600">★</span> Prioridad 1: Suplentes Ideales 
              <span className="text-xs font-normal text-gray-500 bg-gray-200 px-2 py-1 rounded-full">Venta local + Stock Completo</span>
            </h3>
            
            {ideales.length === 0 ? (
              <p className="text-sm text-gray-500 italic p-4 bg-white rounded border border-dashed">
                No hay productos en esta categoría que cumplan con los requisitos ideales.
              </p>
            ) : (
              <div className="grid gap-3">
                {ideales.map(p => (
                  <div key={p.baseSku} className="bg-white p-4 rounded-lg shadow-sm border border-green-100 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-gray-800">{p.baseSku}</p>
                      <p className="text-xs text-gray-500">Stock Total: {p.stock}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-700">{p.sales2w} uds vendidas</p>
                      <span className="inline-block mt-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">COMPLETO</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECCIÓN 2: CABALLOS OSCUROS */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4 flex items-center gap-2">
              <span className="text-purple-600">♞</span> Prioridad 2: Alternativas Globales
              <span className="text-xs font-normal text-gray-500 bg-gray-200 px-2 py-1 rounded-full">Sin venta local + Éxito en otras tiendas</span>
            </h3>
            
            {alternativos.length === 0 ? (
              <p className="text-sm text-gray-500 italic p-4 bg-white rounded border border-dashed">
                No hay alternativas globales disponibles.
              </p>
            ) : (
              <div className="grid gap-3">
                {alternativos.map(p => (
                  <div key={p.baseSku} className="bg-white p-4 rounded-lg shadow-sm border border-purple-100 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-gray-800">{p.baseSku}</p>
                      <p className="text-xs text-gray-500">Stock Local: {p.stock}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-purple-700">{p.globalSales} uds (Nacional)</p>
                      <span className="inline-block mt-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded">COMPLETO AQUÍ</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
};

export default SubstitutionModal;
