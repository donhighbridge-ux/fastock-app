import React, { useState } from 'react';
import type { NormalizedRow, StockHealth, GroupedProduct } from '../types';
import StockDetailModal from './StockDetailModal';
import SimpleMetricModal from './SimpleMetricModal';
import StockRow from './StockRow';
import PaginationControls from './PaginationControls';
import { generateComparativeData } from '../utils/comparativeHelpers';

interface StockTableProps {
  products: GroupedProduct[]; 
  rawData: NormalizedRow[];   
  isMultiStore?: boolean;
  currentStoreName?: string;
  sizeMap: Record<string, string>;
}

const StockTable: React.FC<StockTableProps> = ({ 
  products, 
  rawData, 
  isMultiStore = false, 
  currentStoreName, 
  sizeMap 
}) => {
  
  // --- ESTADOS DE UI ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    variants: NormalizedRow[];
    health: StockHealth | null;
  }>({ isOpen: false, variants: [], health: null });

  interface AggregatedStoreData {
    store: string;
    total: number | string;
    sizes: { size: string; value: number }[];
    statusColor?: string;
    feedbackMessage?: string;
  }

  const [metricModal, setMetricModal] = useState<{
    isOpen: boolean;
    title: string;
    sku: string;
    metricLabel: string;
    data: { size: string; value: number }[];
    isAggregatedView?: boolean;
    aggregatedData?: AggregatedStoreData[];
  } | null>(null);

  // --- LÓGICA DE VISUALIZACIÓN (Paginación) ---
  const totalPages = Math.ceil(products.length / itemsPerPage);
  const currentRows = products.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // --- MANEJADORES DE EVENTOS (Handlers) ---
  
  // 1. Abrir Modal Grande
  const handleOpenModal = (group: GroupedProduct) => {
    const variants = rawData.filter(v => 
      v.sku.toLowerCase().startsWith(group.baseSku)
    );
    setModalState({ isOpen: true, variants, health: group.health });
  };

  // 2. Abrir Modal Métricas (Ventas)
  const handleSalesClick = (group: GroupedProduct) => {
    const variants = rawData.filter(v => v.sku.toLowerCase().startsWith(group.baseSku));
    // Lógica simplificada de métricas
    const salesData = variants.map(v => ({
        size: v.sku.split('_').pop() || 'Uniq',
        value: Number(v.sales2w) || 0
    })).filter(i => i.value > 0);

    setMetricModal({
        isOpen: true,
        title: `Ventas: ${group.name}`,
        sku: group.baseSku,
        metricLabel: 'Ventas 2W',
        data: salesData,
        isAggregatedView: false
    });
  };

  // 3. Abrir Modal Comparativo
  const handleComparativeClick = (e: React.MouseEvent, group: GroupedProduct) => {
    e.stopPropagation();
    
    // 1. Obtenemos todas las filas crudas de este producto
    const variants = rawData.filter(v => v.sku.toLowerCase().startsWith(group.baseSku));
    
    // 2. CREAMOS EL MAPA (El paso que faltaba)
    // Agrupamos: "Tienda X" -> [Fila Talla S, Fila Talla M, ...]
    const variantsByStore = new Map<string, NormalizedRow[]>();
    
    variants.forEach(variant => {
      const storeName = variant.tiendaNombre || 'Sin Tienda';
      if (!variantsByStore.has(storeName)) {
        variantsByStore.set(storeName, []);
      }
      variantsByStore.get(storeName)?.push(variant);
    });

    // 3. Ahora sí pasamos el Mapa que la función espera
    const comparativeData = generateComparativeData(variantsByStore, sizeMap);
    
    setMetricModal({
      isOpen: true,
      title: `Comparativo: ${group.name}`,
      sku: group.baseSku,
      metricLabel: 'Stock Tiendas',
      data: [],
      isAggregatedView: true,
      aggregatedData: comparativeData
    });
  };

  if (products.length === 0) {
    return <div className="p-8 text-center text-gray-500">No se encontraron productos.</div>;
  }

  // --- RENDERIZADO FINAL ---
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full">
      <div className="overflow-x-auto flex-grow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">SKU</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Producto</th>
              {isMultiStore && (
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Tienda</th>
              )}
              <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Disponibilidad</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Vta 2W</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">RA</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentRows.map((group) => (
              <StockRow
                key={isMultiStore ? `${group.baseSku}-${group.storeName}` : group.baseSku}
                product={group}
                isMultiStore={isMultiStore}
                onOpenModal={handleOpenModal}
                onSalesClick={handleSalesClick}
                onComparativeClick={handleComparativeClick}
              />
            ))}
          </tbody>
        </table>
      </div>

      <PaginationControls 
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      {/* MODALES */}
      <StockDetailModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        variants={modalState.variants}
        health={modalState.health}
        sizeMap={sizeMap}
        currentStoreName={currentStoreName}
      />

      {metricModal && (
        <SimpleMetricModal
          onClose={() => setMetricModal(null)}
          {...metricModal} // ✅ Esto ya incluye isOpen, title, sku, data, etc.
        />
      )}
    </div>
  );
};

export default StockTable;
