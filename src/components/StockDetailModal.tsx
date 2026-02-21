import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { NormalizedRow, StockHealth } from '../types';
import { useCart } from '../context/CartContext';

interface StockDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  variants: NormalizedRow[];
  health: StockHealth | null;
  sizeMap: Record<string, string>;
  currentStoreName?: string;
}

const getTimestamp = () => Date.now();

const StockDetailModal: React.FC<StockDetailModalProps> = ({ 
  isOpen, 
  onClose, 
  variants, 
  health, 
  sizeMap, 
  currentStoreName 
}) => {
  
  const { addToRequest, addToTracking } = useCart();
  const [actionFeedback, setActionFeedback] = useState<Record<string, string>>({});
  const [draftRa, setDraftRa] = useState<Record<string, number>>({});

  // ✅ AGREGA ESTO: Un manejador de cierre limpio
  const handleCloseModal = () => {
    setActionFeedback({}); // 1. Limpiamos la memoria del botón visual
    onClose();             // 2. Le avisamos al Padre (StockTable) que cierre el modal
  };

  // --- LÓGICA DE VISUALIZACIÓN ---
  const productTitle = variants[0]?.description || 'Producto Sin Nombre';
  const groupSku = variants[0]?.sku?.split('_').slice(0, 2).join('_') || 'N/A';
  const isReadOnlyMode = !currentStoreName || currentStoreName === 'all';

  // --- 🧠 EL CEREBRO TÁCTICO (Procesamos las filas aquí mismo) ---
  const gridRows = useMemo(() => {
    // 1. Agrupar variantes por talla (por si hay duplicados, aunque no debería)
    const rowsMap = new Map<string, {
      sizeName: string;
      stock: number;
      sales: number;
      transit: number;
      cd: number;
      ra: number;
      skuCompleto: string;
    }>();

    variants.forEach(v => {
      // Limpiamos el nombre de la talla (Ej: "000_S" -> "S")
      const rawSize = v.sku.split('_').pop() || 'UNI';
      const cleanSize = sizeMap[v.sku] || rawSize; 
      
      // Sanitización de números (reemplazando el 'as any' del pasado)
      const stock = Number(v.stock) || 0;
      const sales = Number(v.sales2w) || 0;
      const transit = Number(v.transit) || 0;
      const cd = Number(v.stock_cd) || 0;
      const ra = Number(v.ra) || 0;

      if (!rowsMap.has(cleanSize)) {
        rowsMap.set(cleanSize, { sizeName: cleanSize, stock, sales, transit, cd, ra, skuCompleto: v.sku });
      } else {
        // Si hubiera duplicados, sumamos (caso borde)
        const existing = rowsMap.get(cleanSize)!;
        existing.stock += stock;
        existing.sales += sales;
        existing.transit += transit;
        existing.cd += cd;
        existing.ra = ra;
      }
    });

    // Convertimos a array y ordenamos (S, M, L...)
    // Nota: Aquí podrías necesitar una lógica de ordenamiento de tallas más robusta si el string compare falla
    return Array.from(rowsMap.values()).sort((a, b) => {
       // Intento de ordenamiento numérico o de tallas estándar
       const sizesOrder = ['XXXS','XXS','XS','S','M','L','XL','XXL','XXXL'];
       const idxA = sizesOrder.indexOf(a.sizeName.toUpperCase());
       const idxB = sizesOrder.indexOf(b.sizeName.toUpperCase());
       if (idxA !== -1 && idxB !== -1) return idxA - idxB;
       return a.sizeName.localeCompare(b.sizeName, undefined, { numeric: true });
    });
  }, [variants, sizeMap]);

  if (!isOpen || !health || variants.length === 0) return null;

  // --- HANDLERS DE ACCIÓN (Individuales por fila) ---
  
  const handleAddTracking = (rowSku: string, size: string) => {
    if (isReadOnlyMode) return;
    addToTracking({
      sku: rowSku, // ✅ Ahora usamos el SKU específico (ej: 0000_GP00_M) en lugar del grupo
      description: `${productTitle} (Talla ${size})`,
      timestamp: getTimestamp(), 
      originStore: currentStoreName!
    });
    triggerFeedback(size, 'track');
  };

  const handleAddRequest = (size: string) => {
    if (isReadOnlyMode) return;
    addToRequest({
      sku: groupSku,
      sizes: [size],
      area: variants[0]?.area || 'General',
      description: productTitle,
      timestamp: getTimestamp(),
      originStore: currentStoreName!
    });
    triggerFeedback(size, 'req');
  };

  const triggerFeedback = (id: string, type: 'track' | 'req' | 'ra') => {
    const key = `${id}-${type}`;
    setActionFeedback(prev => ({ ...prev, [key]: 'success' }));
    setTimeout(() => {
      setActionFeedback(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }, 2000);
  };

  // ✅ NUEVO: Maneja los clics en las flechitas de RA (+ y -)
  const handleRaChange = (size: string, delta: number, currentRa: number) => {
    setDraftRa(prev => {
      const currentDraft = prev[size] ?? currentRa;
      const nextVal = Math.max(0, currentDraft + delta); // Evita RA negativas
      return { ...prev, [size]: nextVal };
    });
  };

  // ✅ NUEVO: Envía la nueva RA al carrito de solicitudes
  const handleAddRaRequest = (size: string, newRa: number) => {
    if (isReadOnlyMode) return;
    
    // NOTA: Por ahora usamos addToRequest estándar, pero le ponemos un aviso en la descripción.
    // En la siguiente fase, enseñaremos al CartContext a separar Pedidos de Modificaciones de RA.
    addToRequest({
      sku: groupSku,
      sizes: [size],
      area: variants[0]?.area || 'General',
      description: `${productTitle} (PROPUESTA NUEVA RA: ${newRa})`,
      timestamp: getTimestamp(),
      originStore: currentStoreName!
    });
    triggerFeedback(size, 'ra'); // Da el feedback visual ("✓ Añadido")
  };

  // --- RENDER HELPERS ---
  
  // 🎨 El semáforo individual por celda (Tu dibujo: 0 rojo, 1 amarillo, 2+ verde)
  const getStockColorClass = (val: number) => {
    if (val === 0) return "text-red-600 font-bold bg-red-50 border-b-2 border-red-200";
    if (val === 1) return "text-yellow-600 font-bold bg-yellow-50 border-b-2 border-yellow-200";
    return "text-green-600 font-bold bg-green-50 border-b-2 border-green-200";
  };

  // 🧠 Lógica de Consejo (La columna derecha de tu dibujo)
  const renderAdvice = (row: typeof gridRows[0]) => {
    // Si es 0 o 1, analizamos qué hacer
    if (row.cd > 0) {
      if (row.stock >= 2) {
        return (
          <div className="text-xs leading-tight">
            <span className="text-blue-600 font-bold block mb-1">¿Necesitas más?</span>
            <span className="text-gray-500">Hay {row.cd} en CD.</span>
          </div>
        );  
    } else {    
      return (
        <div className="text-xs leading-tight">
          <span className="text-green-700 font-bold block mb-1">¡Pide Ya!</span>
          <span className="text-gray-500">Hay {row.cd} en CD.</span>
        </div>
      );
    }
  }
    if (row.transit > 0) {
      return (
        <div className="text-xs leading-tight">
          <span className="text-orange-600 font-bold block mb-1">En Tránsito</span>
          <span className="text-gray-500">Ya viene. {row.transit}.</span>
        </div>
      );
    }

        if (row.stock >= 2) { 
      return (
        <div className="text-xs leading-tight">
          <span className="text-gray-500 font-bold block mb-1">Agotado</span>
          <span className="text-gray-400">Solo stock local.</span>
        </div>
      );
    }
    
    return (
      <div className="text-xs leading-tight">
        <span className="text-red-600 font-bold block mb-1">Agotado</span>
        <span className="text-gray-400">Nada que hacer.</span>
      </div>
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
        
        {/* 1. HEADER */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-start bg-white shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-lg font-bold text-gray-900 line-clamp-1" title={productTitle}>{productTitle}</h2>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                 health.status === 'INCOMPLETO' ? 'bg-red-50 text-red-700 border-red-200' :
                 health.status === 'QUEDA POCO' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                 'bg-green-50 text-green-700 border-green-200'
              }`}>
                {health.emoji} {health.status}
              </span>
            </div>
            <p className="text-xs text-gray-400 font-mono">SKU BASE: {groupSku}</p>
          </div>
          <button onClick={handleCloseModal} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
            ✕
          </button>
        </div>

        {/* 2. BODY - LA GRILLA TÁCTICA */}
        <div className="overflow-y-auto p-0 flex-1 bg-gray-50">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-100 border-b border-gray-200 sticky top-0 shadow-sm">
              <tr>
                <th className="px-4 py-3 font-semibold text-center w-24">Talla</th>
                <th className="px-4 py-3 font-semibold text-center w-24">Stock</th>
                <th className="px-4 py-3 font-semibold text-center w-24 text-blue-600">Vta 2W</th>
                <th className="px-4 py-3 font-semibold text-center w-28 text-purple-600">RA</th>
                <th className="px-4 py-3 font-semibold text-center w-24">Diagnóstico</th>
                <th className="px-4 py-3 font-semibold text-center w-24">Seguimiento</th>
                <th className="px-4 py-3 font-semibold text-center w-24">Solicitar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {gridRows.map((row) => (
                <tr key={row.sizeName} className="hover:bg-blue-50/50 transition-colors">
                  
                  {/* TALLA */}
                  <td className="px-4 py-4 text-center font-bold text-gray-700 text-lg">
                    {row.sizeName}
                  </td>
                  
                  {/* STOCK (Semáforo Individual) */}
                  <td className="px-4 py-4 text-center">
                    <span className={`inline-block w-12 py-1 rounded ${getStockColorClass(row.stock)}`}>
                      {row.stock}
                    </span>
                  </td>
                  
                  {/* VENTAS */}
                  <td className="px-4 py-4 text-center font-medium text-gray-600">
                    {row.sales}
                  </td>

                  {/* RA */}
                  <td className="px-4 py-4 text-center">
                    <div className="flex flex-col items-center gap-1.5">
                      {/* El control de numerito con flechas */}
                      <div className="flex items-center gap-2 bg-gray-50 rounded px-2 py-1 border border-gray-200">
                        <button 
                          onClick={() => handleRaChange(row.sizeName, -1, row.ra)} 
                          disabled={isReadOnlyMode}
                          className="text-gray-400 hover:text-red-500 font-bold px-1 disabled:opacity-50"
                        >
                          -
                        </button>
                        <span className="font-bold text-gray-800 w-4 text-center">
                          {draftRa[row.sizeName] ?? row.ra}
                        </span>
                        <button 
                          onClick={() => handleRaChange(row.sizeName, 1, row.ra)} 
                          disabled={isReadOnlyMode}
                          className="text-gray-400 hover:text-green-500 font-bold px-1 disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>
                      
                      {/* Botón +Aumentar (Solo aparece si el usuario modificó el número) */}
                      {((draftRa[row.sizeName] ?? row.ra) !== row.ra && !isReadOnlyMode) && (
                        <button
                          onClick={() => handleAddRaRequest(row.sizeName, draftRa[row.sizeName]!)}
                          className={`text-[10px] px-2 py-1 rounded font-bold shadow-sm border transition-all whitespace-nowrap ${
                            actionFeedback[`${row.sizeName}-ra`] 
                            ? 'bg-purple-600 text-white border-purple-600' 
                            : 'bg-white text-purple-600 border-purple-200 hover:bg-purple-50'
                          }`}
                        >
                          {actionFeedback[`${row.sizeName}-ra`] ? 'Añadido ✓' : '+ Aumentar'}
                        </button>
                      )}
                    </div>
                  </td>

                  {/* 1. CELDA DIAGNÓSTICO */}
                  <td className="px-4 py-4 text-left">
                     {renderAdvice(row)}
                  </td>

                  {/* ACCIONES (Seguir) */}
                  <td className="px-4 py-4 text-center">
                     <button
                       onClick={() => handleAddTracking(row.skuCompleto, row.sizeName)}
                       disabled={isReadOnlyMode}
                       className={`p-2 rounded-full border transition-all ${
                         actionFeedback[`${row.sizeName}-track`] 
                           ? 'bg-green-100 text-green-600 border-green-200' 
                           : 'text-gray-400 border-gray-200 hover:text-blue-600 hover:border-blue-300 bg-white'
                       }`}
                       title="Seguir esta talla"
                     >
                       {actionFeedback[`${row.sizeName}-track`] ? '✓' : '👁️'}
                     </button>
                  </td>

                  {/* 2. CELDA SOLICITAR */}
                  <td className="px-4 py-4 text-center">
                    {(!isReadOnlyMode) && (
                      <button
                        onClick={() => handleAddRequest(row.sizeName)}
                        className={`px-3 py-1.5 text-xs font-bold rounded shadow-sm border transition-all whitespace-nowrap ${
                           actionFeedback[`${row.sizeName}-req`]
                           ? 'bg-green-600 text-white border-green-600'
                           : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'
                        }`}
                      >
                        {actionFeedback[`${row.sizeName}-req`] ? 'Añadido' : '+ Solicitar'}
                      </button>
                    )}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* 3. FOOTER (Aviso de Modo Lectura) */}
        {isReadOnlyMode && (
          <div className="bg-gray-100 p-3 text-center text-xs text-gray-500 border-t border-gray-200">
            🔒 Modo Lectura: Selecciona una tienda específica para realizar solicitudes.
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default StockDetailModal;
