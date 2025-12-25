import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { NormalizedRow } from '../types'; // Asegúrate de importar tus tipos reales si los tienes
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase-config';

type StockStatus = 'COMPLETO' | 'QUEDA POCO' | 'INCOMPLETO';

interface StockDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  variants: NormalizedRow[];
  status: StockStatus;
  sizeMap: Record<string, string>;
}

// --- LÓGICA DE NORMALIZACIÓN DE TALLAS ---
const getCleanSize = (rawSize: string, sizeMap: Record<string, string>): string => {
  if (!rawSize) return '';
  // Paso 1: Extracción - texto después del último guion bajo
  const lastUnderscoreIndex = rawSize.lastIndexOf('_');
  const extracted = lastUnderscoreIndex !== -1 
    ? rawSize.substring(lastUnderscoreIndex + 1) 
    : rawSize;

  // Paso 2: Diccionario (Lookup) - Si el mapa está vacío o no encuentra key, devuelve extracted
  return sizeMap[extracted] || extracted;
};

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

// Definimos qué espera recibir este componente
interface StockTableProps {
  data: NormalizedRow[];
  productDictionary: Record<string, string>; // Recibimos el diccionario desde App.tsx
}

const StockTable: React.FC<StockTableProps> = ({ data, productDictionary }) => {
  
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    variants: NormalizedRow[];
    status: StockStatus;
  }>({
    isOpen: false,
    variants: [],
    status: 'COMPLETO',
  });

  // Estado para el mapa de tallas dinámico
  const [sizeMap, setSizeMap] = useState<Record<string, string>>({});

  // Fetch del mapa de tallas desde Firebase al montar
  useEffect(() => {
    const fetchSizeMap = async () => {
      try {
        const docRef = doc(db, 'configuration', 'general');
        const snap = await getDoc(docRef);
        if (snap.exists() && snap.data().sizeMap) {
          setSizeMap(snap.data().sizeMap);
        }
      } catch (error) {
        console.error('Error fetching size map:', error);
      }
    };
    fetchSizeMap();
  }, []);

  const handleOpenModal = (baseSku: string, status: StockStatus) => {
    console.log("🔘 [DEBUG] Click detectado. BaseSKU:", baseSku, "Status:", status);

    const variants = data.filter((item) => {
      const parts = item.sku.split('_');
      const itemBaseSku = parts.length >= 2 ? parts.slice(0, 2).join('_').toLowerCase() : item.sku.toLowerCase();
      return itemBaseSku === baseSku;
    });

    console.log("📊 [DEBUG] Variantes encontradas:", variants.length, variants);

    setModalState({ isOpen: true, variants, status });
  };

  const handleCloseModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  // 1. EL CEREBRO: Lógica de Agrupación y Suma
  const groupedData = useMemo(() => {
    const groups: Record<string, {
      baseSku: string;
      name: string;
      stock: number;
      transit: number;
      sales2w: number;
      ra: number;
      stock_cd: number;
      isDictionary: boolean;
      originalSku: string; // Guardamos uno de referencia
      hasZero: boolean;
      hasOne: boolean;
    }> = {};

    data.forEach((item) => {
      // CORRECCIÓN CRÍTICA: Usamos '_' porque tus SKUs son tipo "999000_gp00"
      // slice(0, 2) toma las dos primeras partes: "999000" y "gp00" -> "999000_gp00"
      const parts = item.sku.split('_');
      // Si el SKU es corto, usa el original, si es largo, toma la base
      const baseSku = parts.length >= 2 ? parts.slice(0, 2).join('_').toLowerCase() : item.sku.toLowerCase();

      if (!groups[baseSku]) {
        // Buscamos el nombre bonito en el diccionario que viene de Firebase
        const dictionaryName = productDictionary[baseSku];
        
        groups[baseSku] = {
          baseSku,
          originalSku: item.sku,
          // Prioridad: Diccionario > Description (Inglés) > Descripcion (Español) > Aviso
          name: dictionaryName || item.description || "Sin Nombre",
          stock: 0,
          transit: 0,
          sales2w: 0,
          ra: 0,
          stock_cd: 0,
          isDictionary: !!dictionaryName,
          hasZero: false,
          hasOne: false,
        };
      }

      // Sumatoria matemática segura
      groups[baseSku].stock += Number(item.stock) || 0;
      groups[baseSku].transit += Number(item.transit) || 0;
      groups[baseSku].sales2w += Number(item.sales2w) || 0;
      groups[baseSku].ra += Number(item.ra) || 0;
      groups[baseSku].stock_cd += Number(item.stock_cd) || 0;

      // Lógica para determinar Salud de Stock (Analizar cada talla)
      const stockTalla = Number(item.stock || 0);
      if (stockTalla === 0) groups[baseSku].hasZero = true;
      if (stockTalla === 1) groups[baseSku].hasOne = true;
    });

    return Object.values(groups).map(group => {
      let health = { texto: "🟢 COMPLETO", color: "text-green-600 bg-green-50" };
      let status: StockStatus = 'COMPLETO';
      if (group.hasZero) {
        health = { texto: "🔴 INCOMPLETO", color: "text-red-600 bg-red-50" };
        status = 'INCOMPLETO';
      } else if (group.hasOne) {
        health = { texto: "🟡 QUEDA POCO", color: "text-yellow-600 bg-yellow-50" };
        status = 'QUEDA POCO';
      }
      return { ...group, health, status };
    });
  }, [data, productDictionary]);

  // 2. LA CARA: Renderizado Visual
  if (!groupedData || groupedData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg border border-dashed border-gray-300">
        <p className="text-gray-500 text-lg">No hay productos que coincidan con los filtros.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden shadow-lg ring-1 ring-black ring-opacity-5 rounded-lg bg-white">
      <div className="overflow-x-auto max-h-[70vh]"> {/* max-h define el scroll interno */}
        <table className="min- divide-y divide-gray-300">
          
          {/* Header Pegajoso (Sticky) */}
          <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th scope="col" className="py-4 pl-6 pr-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[140px]">
                SKU
              </th>
              <th scope="col" className="px-3 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                Nombre
              </th>
              <th scope="col" className="px-3 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[100px]">
                Stock
              </th>
              <th scope="col" className="px-3 py-4 text-center text-xs font-bold text-blue-600 uppercase tracking-wider min-w-[80px]">
                Vta 2W
              </th>
              <th scope="col" className="px-3 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[120px]">
                Salud Stock
              </th>
              <th scope="col" className="px-3 py-4 text-center text-xs font-bold text-purple-600 uppercase tracking-wider min-w-[80px]">
                RA
              </th>
              <th scope="col" className="px-3 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[80px]">
                CD
              </th>
              <th scope="col" className="px-3 py-4 text-center text-xs font-bold text-orange-400 uppercase tracking-wider min-w-[100px]">
                En Tránsito
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 bg-white">
            {groupedData.map((group, index) => (
              <tr 
                key={group.baseSku} 
                className="hover:bg-blue-50 transition-colors duration-150 group" // Efecto hover suave
              >
                {/* 1. Columna SKU: Fuente Mono para legibilidad técnica */}
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-center text-xs font-mono text-gray-600 group-hover:text-blue-600">
                  {group.baseSku}
                </td>

                {/* 2. Columna Nombre: Fuente Sans, color oscuro para lectura */}
                <td className="whitespace-nowrap px-2 py-4 text-center text-xs font-medium text-gray-900">
                  <div className="flex items-center">
                    {group.isDictionary && (
                      <span className="mr-2 text-xs" title="Nombre oficial verificado">🏷️</span>
                    )}
                    {group.name}
                  </div>
                </td>

                {/* 3. Columna Stock: El dato Estrella. Grande y claro. */}
                <td className="whitespace-nowrap px-2 py-4 text-center">
                  <span className={`text-xs font-bold ${group.stock > 0 ? 'text-blue-700' : 'text-red-400'}`}>
                    {group.stock}
                  </span>
                </td>

                {/* Columna Venta 2W */}
                <td className="whitespace-nowrap px-2 py-4 text-center">
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                    {group.sales2w}
                  </span>
                </td>

                {/* Columna Salud Stock (Nueva) */}
                <td className="whitespace-nowrap px-2 py-4 text-center">
                  <button
                    onClick={() => handleOpenModal(group.baseSku, group.status)}
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer focus:outline-none ${group.health.color}`}
                  >
                    {group.health.texto}
                  </button>
                </td>

                {/* Columna RA */}
                <td className="whitespace-nowrap px-2 py-4 text-center text-xs text-purple-700 font-medium">
                  {group.ra}
                </td>
                {/* Columna Stock CD */}
                <td className="whitespace-nowrap px-2 py-4 text-center text-xs text-gray-600">
                  {group.stock_cd}
                </td>

                {/* 4. Columna Tránsito: Información secundaria, más sutil */}
                <td className="whitespace-nowrap px-2 py-4 text-xs text-center text-gray-400 font-medium">
                  {group.transit > 0 ? (
                    <span className="text-orange-500 flex items-center justify-center gap-1">
                      🚚 {group.transit}
                    </span>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Footer informativo */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 text-xs text-gray-500 text-right">
        Mostrando {groupedData.length} productos únicos (Agrupados por SKU)
      </div>

      <StockDetailModal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        variants={modalState.variants}
        status={modalState.status}
        sizeMap={sizeMap}
      />
    </div>
  );
};

export default StockTable;