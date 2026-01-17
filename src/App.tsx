import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, getDocs, writeBatch, doc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase-config';
import { CartProvider, useCart } from './context/CartContext';
import FileUpload from './components/FileUpload';
import ProductSearch from './components/ProductSearch';
import DashboardFilters from './components/Dashboard/DashboardFilters';
import StockTable from './components/StockTable';
import RequestCartView from './components/RequestCartView';
import TrackingListView from './components/TrackingListView';
import type { NormalizedRow } from './types';
import './App.css';

const ORGANIZATION_ID = "demo_org_v1";
const ALL_STORES_OPTION = "Todas las Tiendas";

// --- COMPONENTE DE BIENVENIDA (Onboarding) ---
interface WelcomeScreenProps {
  step: 'brand' | 'store';
  options: string[];
  onSelect: (val: string) => void;
  onBack?: () => void;
  instruction: string;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ step, options, onSelect, onBack, instruction }) => {
  return (
    <div className="flex flex-col justify-center items-center h-[70vh] relative animate-fade-in">
      {/* Botón Volver (Solo en paso Tienda) */}
      {step === 'store' && onBack && (
        <button
          onClick={onBack}
          className="absolute top-0 left-0 p-4 text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-2 group"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span>
          <span className="text-sm font-medium">Volver a Marcas</span>
        </button>
      )}

      {/* Encabezado */}
      <h1 className="text-4xl font-bold text-gray-800 mb-12 tracking-tight">Bienvenido a FASTock</h1>

      {/* Contenedor del Selector */}
      <div className="w-full max-w-md flex flex-col items-center gap-6">
        <p className="text-xl font-bold text-slate-900 text-center">{instruction}</p>

        <select
          className="w-72 px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-700 appearance-none cursor-pointer text-center text-base font-medium hover:border-blue-400 transition-colors"
          onChange={(e) => e.target.value && onSelect(e.target.value)}
          defaultValue=""
        >
          <option value="" disabled>Seleccionar...</option>
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        
        <div className="text-xs text-gray-400 mt-2">
          {options.length} opciones disponibles
        </div>
      </div>
    </div>
  );
};

const Sidebar = ({ currentView, setCurrentView }: { currentView: 'dashboard' | 'upload' | 'cart' | 'tracking', setCurrentView: (t: 'dashboard' | 'upload' | 'cart' | 'tracking') => void }) => {
  const { requestList, trackingList } = useCart();

  return (
    <aside className="w-64 bg-slate-900 flex-shrink-0 flex flex-col h-full text-white border-r border-slate-800 shadow-xl z-20">
      <div className="p-6">
        <h1 className="text-2xl font-bold">FASTock Admin</h1>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        <button
          onClick={() => setCurrentView('dashboard')}
          className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
            currentView === 'dashboard' ? 'bg-slate-800 text-white' : 'text-gray-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          📊 Tablero
        </button>
        <button
          onClick={() => setCurrentView('upload')}
          className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
            currentView === 'upload' ? 'bg-slate-800 text-white' : 'text-gray-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          📤 Carga de Datos
        </button>

        {/* Solicitud (Carrito) */}
        <button
          onClick={() => setCurrentView('cart')}
          className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex justify-between items-center ${
            currentView === 'cart' ? 'bg-slate-800 text-white' : 'text-gray-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-2">🛒 Solicitud</span>
          {requestList.length > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
              {requestList.length}
            </span>
          )}
        </button>

        {/* Seguimiento */}
        <button
          onClick={() => setCurrentView('tracking')}
          className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex justify-between items-center ${
            currentView === 'tracking' ? 'bg-slate-800 text-white' : 'text-gray-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-2">👁️ Seguimiento</span>
          {trackingList.length > 0 && (
            <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
              {trackingList.length}
            </span>
          )}
        </button>
      </nav>
    </aside>
  );
};

function App() {
    const [data, setData] = useState<NormalizedRow[]>([]);
  const [filteredData, setFilteredData] = useState<NormalizedRow[]>(data);
  const [isLoading, setIsLoading] = useState(true);
  const [productDictionary, setProductDictionary] = useState<Record<string, string>>({});
  const [currentView, setCurrentView] = useState<'dashboard' | 'upload' | 'cart' | 'tracking'>('dashboard');
  const [currentFilters, setCurrentFilters] = useState<{
    marca: string | null;
    tienda: string | null;
    area: string | null;
    categoria: string | null;
  }>({ marca: null, tienda: null, area: null, categoria: null });

  // Función para obtener datos de stock (Persistencia al recargar)
  const fetchStockData = async () => {
    console.log("📡 Obteniendo datos de Firebase...", ORGANIZATION_ID);
    setIsLoading(true);
    try {
      const stockRef = collection(db, "organizations", ORGANIZATION_ID, "stock");
      const snapshot = await getDocs(stockRef);
      
      const docs = snapshot.docs.map(doc => doc.data() as NormalizedRow);
      console.log("✅ Datos recuperados:", docs.length);
      
      setData(docs);
      setFilteredData(docs);
    } catch (error) {
      console.error("❌ Error al obtener datos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStockData();
  }, []);

  // Suscripción al Diccionario de Productos (Con Fallback)
  useEffect(() => {
    let unsubscribeFallback: (() => void) | undefined;

    // 1. Intentar ruta de organización
    const dictRef = collection(db, "organizations", ORGANIZATION_ID, "product_dictionary");
    
    const unsubscribe = onSnapshot(dictRef, (snapshot) => {
      const dict: Record<string, string> = {};
      snapshot.forEach((doc) => {
        const d = doc.data();
        if (d.sku && d.friendlyName) {
          dict[d.sku.toLowerCase().trim()] = d.friendlyName;
        }
      });
      setProductDictionary(dict);
    }, (error) => {
      console.warn("⚠️ Diccionario de organización no accesible, intentando ruta raíz...", error);
      // 2. Fallback a ruta raíz
      const fallbackRef = collection(db, "product_dictionary");
      unsubscribeFallback = onSnapshot(fallbackRef, (snapshot) => {
        const dict: Record<string, string> = {};
        snapshot.forEach((doc) => {
          const d = doc.data();
          if (d.sku && d.friendlyName) {
            dict[d.sku.toLowerCase().trim()] = d.friendlyName;
          }
        });
        setProductDictionary(dict);
      });
    });

    return () => {
      unsubscribe();
      if (unsubscribeFallback) unsubscribeFallback();
    };
  }, []);

  const handleFileUpload = async (normalizedData: NormalizedRow[], type: string) => {
    setIsLoading(true);
    try {
      // Determinamos la colección destino. Usamos 'product_dictionary' para coincidir con la lectura.
      const collectionName = type === 'stock' ? 'stock' : 'product_dictionary';
      const collectionRef = collection(db, "organizations", ORGANIZATION_ID, collectionName);
      
      // 1. Limpieza previa (Borrar colección antigua para evitar duplicados/fantasmas)
      const q = await getDocs(collectionRef);
      const batchDelete = writeBatch(db);
      q.forEach((doc) => batchDelete.delete(doc.ref));
      await batchDelete.commit();

      // 2. Escritura por lotes (Batches de 500, límite de Firestore)
      const batchSize = 500;
      let totalUploaded = 0;

      for (let i = 0; i < normalizedData.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = normalizedData.slice(i, i + batchSize);
        chunk.forEach((row) => {
          const docRef = doc(collectionRef); // ID automático
          batch.set(docRef, row);
        });
        await batch.commit();

        totalUploaded += chunk.length;
        const porcentaje = Math.round((totalUploaded / normalizedData.length) * 100);
        console.log(`⏳ Subiendo... ${totalUploaded}/${normalizedData.length} filas (${porcentaje}%).`);
      }

      // 3. Actualizar Estado Local (Solo si es stock, para reflejar cambios inmediatos en la tabla)
      if (type === 'stock') {
        setData(normalizedData);
        setFilteredData(normalizedData);
      }
      console.log(`✅ PROCESO FINALIZADO:`);
      console.log(`   - Filas recibidas del Excel: ${normalizedData.length}`);
      console.log(`   - Documentos creados en Firebase: ${totalUploaded}`);
      console.log(normalizedData.length === totalUploaded ? "   🌟 MATCH PERFECTO" : "   ⚠️ ALERTA: Diferencia de filas detectada");
    } catch (error) {
      console.error("❌ Error al guardar en Firebase:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Lógica de Onboarding y Filtros ---

  // 1. Obtener Marcas Únicas
  const uniqueBrands = useMemo(() => {
    return Array.from(new Set(data.map(item => item.marca))).filter(Boolean).sort();
  }, [data]);

  // 2. Obtener Tiendas Únicas (Filtradas por Marca)
  const uniqueStores = useMemo(() => {
    if (!currentFilters.marca) return [];
    const stores = Array.from(new Set(data
      .filter(item => item.marca === currentFilters.marca)
      .map(item => item.tiendaNombre)
    )).filter(Boolean).sort();
    return [ALL_STORES_OPTION, ...stores]; // Agregamos siempre la opción "Todas"
  }, [data, currentFilters.marca]);

  const handleFilterChange = (filters: { marca: string | null; tienda: string | null; area: string | null; categoria: string | null }) => {
    // BUG FIX #3: Evitar "Kickback" a la pantalla de bienvenida al cambiar filtros en el Dashboard.
    // Si hay marca seleccionada pero la tienda se reinició (null/undefined), forzamos "Todas las Tiendas".
    const safeFilters = { ...filters };
    if (safeFilters.marca && !safeFilters.tienda) {
      safeFilters.tienda = ALL_STORES_OPTION;
    }

    setCurrentFilters(safeFilters);
    
    let newData = [...data];

    if (safeFilters.marca) newData = newData.filter(item => item.marca === safeFilters.marca);
    
    // CRÍTICO: Si es "Todas las Tiendas", NO filtramos por tienda, dejamos pasar todas las de la marca.
    if (safeFilters.tienda && safeFilters.tienda !== ALL_STORES_OPTION) {
      newData = newData.filter(item => item.tiendaNombre === safeFilters.tienda);
    }
    if (safeFilters.area) newData = newData.filter(item => item.area === safeFilters.area);
    if (safeFilters.categoria) newData = newData.filter(item => item.categoria === safeFilters.categoria);

    setFilteredData(newData);
  };

  const handleSearch = (searchTerm: string) => {
    const searchTermLower = searchTerm.toLowerCase();
    const newData = data.filter(item => item.sku.toLowerCase().includes(searchTermLower) || item.description.toLowerCase().includes(searchTermLower));
    setFilteredData(newData);
  };

  if (isLoading) {
    return (
      <div className="app-container">
        <h1 className="text-2xl font-bold mb-4">Cargando datos...</h1>
      </div>
    );
  }

  return (
    <CartProvider>
    <div className="flex h-screen w-full bg-red-600 overflow-hidden">
      {/* Sidebar */}
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-8">
          {currentView === 'dashboard' && (
            <>
              {/* ESTADO CERO: Sin Datos */}
              {data.length === 0 && !isLoading ? (
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
                  <div className="bg-gray-100 p-6 rounded-full">
                    <span className="text-4xl">📂</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">No hay datos cargados</h2>
                    <p className="text-gray-500 mt-2">Sube tu planilla de stock para comenzar a trabajar.</p>
                  </div>
                  <button 
                    onClick={() => setCurrentView('upload')}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:scale-105 transform duration-200"
                  >
                    Ir a Carga de Datos
                  </button>
                </div>
              ) : !currentFilters.marca ? (
                /* ESTADO UNO: Selección de Marca */
                <WelcomeScreen 
                  step="brand"
                  instruction="Selecciona Una Marca Para Comenzar"
                  options={uniqueBrands}
                  onSelect={(brand) => handleFilterChange({ ...currentFilters, marca: brand })}
                />
              ) : !currentFilters.tienda ? (
                /* ESTADO DOS: Selección de Tienda */
                <WelcomeScreen 
                  step="store"
                  instruction="Selecciona Una Tienda Para Continuar"
                  options={uniqueStores}
                  onSelect={(store) => handleFilterChange({ ...currentFilters, tienda: store })}
                  onBack={() => handleFilterChange({ ...currentFilters, marca: null })}
                />
              ) : (
                /* ESTADO TRES: El Dashboard (Solo si hay tienda seleccionada) */
                <>
                  <h2 className="text-2xl font-bold mb-4 text-gray-800 ml-[52px]">Tablero de Control</h2>
                  <DashboardFilters 
                    data={data} 
                    onFilter={handleFilterChange} 
                    onSearch={handleSearch} 
                    selectedFilters={currentFilters} 
                  />
                  <div className="min-h-[500px] transition-all duration-300">
                    <StockTable 
                      data={filteredData} 
                      productDictionary={productDictionary} 
                      isMultiStore={currentFilters.tienda === ALL_STORES_OPTION}
                    />
                  </div>
                </>
              )}
            </>
          )}

          {currentView === 'upload' && (
            <div className="max-w-3xl mx-auto mt-10">
              <div className="mb-6 text-center">
                <h2 className="text-3xl font-bold text-gray-800">Centro de Carga</h2>
                <p className="text-gray-500">Subir y normalizar archivo de stock</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <FileUpload onUpload={handleFileUpload} organizationId={ORGANIZATION_ID} />
              </div>
            </div>
          )}

          {currentView === 'cart' && (
            <div className="max-w-7xl mx-auto mt-4">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Carrito de Solicitud</h2>
              <RequestCartView />
            </div>
          )}

          {currentView === 'tracking' && (
            <div className="max-w-7xl mx-auto mt-4">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">Lista de Seguimiento</h2>
              <TrackingListView currentData={data} />
            </div>
          )}
        </div>
      </main>
    </div>
    </CartProvider>
  );
}

export default App;
