import React, { useState, useEffect } from 'react';
import type { NormalizedRow, StockHealth } from '../types'; // Asegúrate de importar tus tipos reales si los tienes
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase-config';
import StockDetailModal from './StockDetailModal';
import { useStockGrouping } from '../hooks/useStockGrouping';
import SimpleMetricModal from './SimpleMetricModal';
import { getCleanSize } from '../utils/stockUtils';
import { generateComparativeData } from '../utils/comparativeHelpers';

// Definimos qué espera recibir este componente
interface StockTableProps {
  data: NormalizedRow[];
  productDictionary: Record<string, string>; // Recibimos el diccionario desde App.tsx
  isMultiStore?: boolean;
  searchTerm?: string;
}

const StockTable: React.FC<StockTableProps> = ({ data, productDictionary, isMultiStore = false, searchTerm = '' }) => {
  
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    variants: NormalizedRow[];
    health: StockHealth | null;
  }>({
    isOpen: false,
    variants: [],
    health: null,
  });

  const [metricModal, setMetricModal] = useState<{
    isOpen: boolean;
    title: string;
    sku: string;
    metricLabel: string;
    data: { size: string; value: number }[];
    isAggregatedView?: boolean;
    aggregatedData?: { store: string; total: number | string; sizes: { size: string; value: number }[]; statusColor?: string; feedbackMessage?: string }[];
  } | null>(null);

  console.log("🔄 [DEBUG] Render StockTable. MetricModal State:", metricModal);

  // Estado para el mapa de tallas dinámico
  const [sizeMap, setSizeMap] = useState<Record<string, string>>({});

  // ESTADO DE PAGINACIÓN
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

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

  const handleStockClick = (e: React.MouseEvent, group: any) => {
    e.stopPropagation();
    console.log("🔘 [DEBUG] Click Stock recibido. Group:", group);
    const variants = data.filter((item) => {
      const parts = item.sku.split('_');
      const itemBaseSku = parts.length >= 2 ? parts.slice(0, 2).join('_').toLowerCase() : item.sku.toLowerCase();
      return itemBaseSku === group.baseSku;
    });

    if (isMultiStore) {
      // Lógica para "Todas las Tiendas": Agrupar por tienda
      const storesMap = new Map<string, { size: string; value: number }[]>();
      
      variants.forEach(v => {
        const size = getCleanSize(v.sku, sizeMap);
        const val = Number(v.stock) || 0;
        if (val > 0) { // Solo tiendas con stock
          if (!storesMap.has(v.tiendaNombre)) {
            storesMap.set(v.tiendaNombre, []);
          }
          storesMap.get(v.tiendaNombre)?.push({ size, value: val });
        }
      });

      const aggregatedData = Array.from(storesMap.entries()).map(([store, sizes]) => ({
        store,
        total: sizes.reduce((acc, curr) => acc + curr.value, 0),
        sizes: sizes.sort((a, b) => a.size.localeCompare(b.size, undefined, { numeric: true }))
      })).sort((a, b) => b.total - a.total); // Ordenar tiendas por stock total descendente

      setMetricModal({
        isOpen: true,
        title: group.name,
        sku: group.baseSku,
        metricLabel: "Stock Global",
        data: [], // No se usa en modo agregado
        isAggregatedView: true,
        aggregatedData: aggregatedData
      });
    } else {
      // Lógica original para Tienda Única
      const metricData = variants
        .map(v => ({
          size: getCleanSize(v.sku, sizeMap),
          value: Number(v.stock) || 0
        }))
        .sort((a, b) => a.size.localeCompare(b.size, undefined, { numeric: true }));

      setMetricModal({
        isOpen: true,
        title: group.name,
        sku: group.baseSku,
        metricLabel: "Stock en Tienda",
        data: metricData,
        isAggregatedView: false
      });
    }
  };

  const handleSalesClick = (e: React.MouseEvent, group: any) => {
    e.stopPropagation();
    console.log("🔘 [DEBUG] Click Ventas recibido. Group:", group);
    const variants = data.filter((item) => {
      const parts = item.sku.split('_');
      const itemBaseSku = parts.length >= 2 ? parts.slice(0, 2).join('_').toLowerCase() : item.sku.toLowerCase();
      return itemBaseSku === group.baseSku;
    });

    if (isMultiStore) {
      // Lógica para "Todas las Tiendas": Agrupar por tienda (Ventas)
      const storesMap = new Map<string, { size: string; value: number }[]>();
      
      variants.forEach(v => {
        const size = getCleanSize(v.sku, sizeMap);
        const val = Number(v.sales2w) || 0; // Usamos sales2w
        if (val > 0) {
          if (!storesMap.has(v.tiendaNombre)) {
            storesMap.set(v.tiendaNombre, []);
          }
          storesMap.get(v.tiendaNombre)?.push({ size, value: val });
        }
      });

      const aggregatedData = Array.from(storesMap.entries()).map(([store, sizes]) => ({
        store,
        total: sizes.reduce((acc, curr) => acc + curr.value, 0),
        sizes: sizes.sort((a, b) => a.size.localeCompare(b.size, undefined, { numeric: true }))
      })).sort((a, b) => b.total - a.total);

      setMetricModal({
        isOpen: true,
        title: group.name,
        sku: group.baseSku,
        metricLabel: "Ventas Globales 2W",
        data: [],
        isAggregatedView: true,
        aggregatedData: aggregatedData
      });
    } else {
      const metricData = variants
        .map(v => ({
          size: getCleanSize(v.sku, sizeMap),
          value: Number(v.sales2w) || 0
        }))
        .sort((a, b) => a.size.localeCompare(b.size, undefined, { numeric: true }));

      setMetricModal({
        isOpen: true,
        title: group.name,
        sku: group.baseSku,
        metricLabel: "Ventas 2 Semanas",
        data: metricData,
        isAggregatedView: false
      });
    }
  };

  const handleComparativeClick = (e: React.MouseEvent, group: any) => {
    e.stopPropagation();
    
    // 1. Filtrar variantes del SKU base
    const variants = data.filter((item) => {
      const parts = item.sku.split('_');
      const itemBaseSku = parts.length >= 2 ? parts.slice(0, 2).join('_').toLowerCase() : item.sku.toLowerCase();
      return itemBaseSku === group.baseSku;
    });

    // 2. Agrupar por tienda
    const storesMap = new Map<string, NormalizedRow[]>();
    variants.forEach(v => {
      if (!storesMap.has(v.tiendaNombre)) {
        storesMap.set(v.tiendaNombre, []);
      }
      storesMap.get(v.tiendaNombre)?.push(v);
    });

    // 3. Calcular estado por tienda
    // Delegamos la lógica al helper externo para garantizar paridad y limpieza
    const aggregatedData = generateComparativeData(storesMap, sizeMap);

    setMetricModal({
      isOpen: true,
      title: group.name,
      sku: group.baseSku,
      metricLabel: "Informe Comparativo",
      data: [],
      isAggregatedView: true,
      aggregatedData: aggregatedData
    });
  };

  // 1. EL CEREBRO: Lógica de Agrupación y Suma (Extraída a Hook)
  const groupedData = useStockGrouping(data, productDictionary, sizeMap, searchTerm, isMultiStore);

  // Resetear página cuando cambian los datos (filtros)
  useEffect(() => {
    setCurrentPage(1);
  }, [groupedData]);

  // LÓGICA DE CORTE (SLICING)
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  // Protegemos contra null/undefined aunque el hook suele devolver array vacío
  const currentRows = groupedData ? groupedData.slice(indexOfFirstItem, indexOfLastItem) : [];
  const totalPages = groupedData ? Math.ceil(groupedData.length / itemsPerPage) : 0;

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
              {isMultiStore && searchTerm && (
                <th scope="col" className="px-3 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Tienda
                </th>
              )}
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
            {currentRows.map((group, index) => (
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

                {isMultiStore && searchTerm && (
                  <td className="whitespace-nowrap px-3 py-4 text-center text-xs font-medium text-gray-500">
                    {group.storeName}
                  </td>
                )}

{/* 3. Columna Stock: Restaurada (Estable) */}
                <td className="whitespace-nowrap px-2 py-4 text-center">
                  {isMultiStore ? (
                    /* CASO 1: Modo Todas las Tiendas */
                    <span 
                      onClick={(e) => handleStockClick(e, group)}
                      className={`text-xs font-bold cursor-pointer hover:text-blue-600 underline decoration-dotted underline-offset-2 px-2 py-1 rounded ${group.stock > 0 ? 'text-blue-700' : 'text-red-400'}`}
                    >
                      {group.stock}
                    </span>
                  ) : (
                    /* CASO 2: Tienda Única */
                    <span 
                      onClick={(e) => handleStockClick(e, group)}
                      className={`text-xs font-bold cursor-pointer hover:text-blue-600 underline decoration-dotted underline-offset-2 px-2 py-1 rounded ${group.stock > 0 ? 'text-blue-700' : 'text-red-400'}`}
                    >
                      {group.stock}
                    </span>
                  )}
                </td>

                {/* Columna Venta 2W: Restaurada (Estable) */}
                <td className="whitespace-nowrap px-2 py-4 text-center">
                  {isMultiStore ? (
                    <span 
                      onClick={(e) => handleSalesClick(e, group)}
                      className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full cursor-pointer hover:text-blue-800 underline decoration-dotted underline-offset-2"
                    >
                      {group.sales2w}
                    </span>
                  ) : (
                    <span 
                      onClick={(e) => handleSalesClick(e, group)}
                      className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full cursor-pointer hover:text-blue-800 underline decoration-dotted underline-offset-2"
                    >
                      {group.sales2w}
                    </span>
                  )}
                </td>

                {/* Columna Salud Stock (Nueva) */}
                <td 
                  className="whitespace-nowrap px-2 py-4 text-center cursor-pointer"
                >
                  {isMultiStore && !group.storeName ? (
                    /* CASO 1: Visión Global Agrupada -> Botón Comparativo */
                    <button
                      onClick={(e) => handleComparativeClick(e, group)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center justify-center gap-1 mx-auto transition-colors"
                    >
                      <span>📊</span> Comparativo
                    </button>
                  ) : (
                    /* CASO 2: Fila Específica (Tienda Única o Desglose de Búsqueda) -> Semáforo Real */
                    <span
                      onClick={() => handleOpenModal(group.baseSku, group.health)}
                      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer shadow-sm transition-all hover:shadow-md max-w-[200px] truncate ${getStatusColor(group.health.status)}`}
                      title={group.health.status}
                    >
                      {group.health.emoji} {group.health.status}
                    </span>
                  )}
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
      
      {/* COMPONENTE DE CONTROL DE PÁGINAS (FOOTER) */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
        
        {/* Selector de filas por página */}
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <span className="font-medium">Filas:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500 py-1 pl-2 pr-6 bg-white cursor-pointer"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        {/* Indicador de Resultados */}
        <div className="text-sm text-gray-600">
          Mostrando <span className="font-bold text-gray-900">{indexOfFirstItem + 1}</span> - <span className="font-bold text-gray-900">{Math.min(indexOfLastItem, groupedData.length)}</span> de <span className="font-bold text-gray-900">{groupedData.length}</span> productos
        </div>

        {/* Botones de Navegación */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Primera Página"
          >
            <span className="sr-only">Primera</span>
            «
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-md border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Anterior
          </button>
          
          <span className="mx-2 text-sm font-medium text-gray-700">
            Pág {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 rounded-md border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Siguiente
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Última Página"
          >
            <span className="sr-only">Última</span>
            »
          </button>
        </div>
      </div>

      <StockDetailModal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        variants={modalState.variants}
        health={modalState.health}
        sizeMap={sizeMap}
      />

      {metricModal && (
        <SimpleMetricModal
          isOpen={metricModal.isOpen}
          onClose={() => setMetricModal(null)}
          title={metricModal.title}
          sku={metricModal.sku}
          metricLabel={metricModal.metricLabel}
          data={metricModal.data}
          isAggregatedView={metricModal.isAggregatedView}
          aggregatedData={metricModal.aggregatedData}
        />
      )}
    </div>
  );
};

export default StockTable;