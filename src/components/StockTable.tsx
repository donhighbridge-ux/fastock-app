import React, { useState, useEffect } from 'react';
import type { NormalizedRow, StockHealth } from '../types'; // Asegúrate de importar tus tipos reales si los tienes
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase-config';
import StockDetailModal from './StockDetailModal';
import { useStockGrouping } from '../hooks/useStockGrouping';

// Definimos qué espera recibir este componente
interface StockTableProps {
  data: NormalizedRow[];
  productDictionary: Record<string, string>; // Recibimos el diccionario desde App.tsx
}

const StockTable: React.FC<StockTableProps> = ({ data, productDictionary }) => {
  
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    variants: NormalizedRow[];
    health: StockHealth | null;
  }>({
    isOpen: false,
    variants: [],
    health: null,
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

  const handleOpenModal = (baseSku: string, health: StockHealth) => {
    console.log("🔘 [DEBUG] Click detectado. BaseSKU:", baseSku, "Health:", health);

    const variants = data.filter((item) => {
      const parts = item.sku.split('_');
      const itemBaseSku = parts.length >= 2 ? parts.slice(0, 2).join('_').toLowerCase() : item.sku.toLowerCase();
      return itemBaseSku === baseSku;
    });

    console.log("📊 [DEBUG] Variantes encontradas:", variants.length, variants);

    setModalState({ isOpen: true, variants, health });
  };

  const handleCloseModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  // 1. EL CEREBRO: Lógica de Agrupación y Suma (Extraída a Hook)
  const groupedData = useStockGrouping(data, productDictionary, sizeMap);

  // Helper para colores de la tabla
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'STOCK OK': return "text-green-600 bg-green-50 border border-green-200";
      case 'EN TRÁNSITO': return "text-orange-700 bg-orange-50 border border-orange-200";
      case 'PIDE SOLO...': return "text-yellow-700 bg-yellow-50 border border-yellow-200";
      case 'NADA EN EL CD': return "text-red-700 bg-red-50 border border-red-200";
      default: return "text-gray-600 bg-gray-50";
    }
  };

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
                Informe de Estado
              </th>
              <th scope="col" className="px-3 py-4 text-center text-xs font-bold text-purple-600 uppercase tracking-wider min-w-[80px]">
                RA
              </th>
              {/* <th scope="col" className="px-3 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[80px]">
                CD
              </th>
              <th scope="col" className="px-3 py-4 text-center text-xs font-bold text-orange-400 uppercase tracking-wider min-w-[100px]">
                En Tránsito
              </th> */}
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
                  <span className={`text-xs font-bold cursor-pointer hover:bg-gray-50 px-2 py-1 rounded ${group.stock > 0 ? 'text-blue-700' : 'text-red-400'}`}>
                    {group.stock}
                  </span>
                </td>

                {/* Columna Venta 2W */}
                <td className="whitespace-nowrap px-2 py-4 text-center">
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full cursor-pointer hover:bg-gray-50">
                    {group.sales2w}
                  </span>
                </td>

                {/* Columna Salud Stock (Nueva) */}
                <td 
                  className="whitespace-nowrap px-2 py-4 text-center cursor-pointer"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleOpenModal(group.baseSku, group.health)}
                >
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer shadow-sm transition-all hover:shadow-md max-w-[200px] truncate ${getStatusColor(group.health.status)}`}
                    title={group.health.status}
                  >
                    {group.health.emoji} {group.health.status}
                  </span>
                </td>

                {/* Columna RA */}
                <td className="whitespace-nowrap px-2 py-4 text-center text-xs text-purple-700 font-medium">
                  {group.ra}
                </td>
                {/* Columna Stock CD */}
                {/* <td className="whitespace-nowrap px-2 py-4 text-center text-xs text-gray-600">
                  {group.stock_cd}
                </td> */}

                {/* 4. Columna Tránsito: Información secundaria, más sutil */}
                {/* <td className="whitespace-nowrap px-2 py-4 text-xs text-center text-gray-400 font-medium">
                  {group.transit > 0 ? (
                    <span className="text-orange-500 flex items-center justify-center gap-1">
                      🚚 {group.transit}
                    </span>
                  ) : (
                    "-"
                  )}
                </td> */}
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
        health={modalState.health}
        sizeMap={sizeMap}
      />
    </div>
  );
};

export default StockTable;