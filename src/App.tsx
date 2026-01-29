import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase-config';
import { CartProvider, useCart } from './context/CartContext';
import FileUpload from './components/FileUpload';
import DashboardFilters from './components/Dashboard/DashboardFilters';
import StockTable from './components/StockTable';
import RequestCartView from './components/RequestCartView';
import { TrackingListView } from './components/TrackingListView';
import StockHealthFilters from './components/Dashboard/StockHealthFilters';
import type { NormalizedRow } from './types';
import NotificationBell from './components/NotificationBell';
import './App.css';
import { uploadStockBatch } from './services/firebaseStockService';
import { uploadDictionaryBatch } from './services/dictionaryService';
import { useStockGrouping } from './hooks/useStockGrouping';

const ORGANIZATION_ID = "demo_org_v1";
const ALL_STORES_OPTION = "Todas las Tiendas";
const ALL_STORES_ID = 'all';

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
    <div className="flex flex-col justify-center items-center h-[70vh] relative animate-fade-in bg-white">
      {/* Botón Volver */}
      {step === 'store' && onBack && (
        <button
          onClick={onBack}
          className="absolute top-0 left-0 p-4 text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-2"
        >
          <span>← Volver</span>
        </button>
      )}

      <div className="w-full max-w-md px-6 flex flex-col items-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Bienvenido a FASTock</h1>
        <p className="text-xl text-gray-600 mb-8 text-center">{instruction}</p>
        
        <div className="w-full relative">
          <select
            key={`${step}-${options.length}`} 
            className="w-full p-4 pr-10 text-lg border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm appearance-none cursor-pointer transition-all hover:border-gray-400"
            defaultValue=""
            onChange={(e) => onSelect(e.target.value)}
          >
            <option value="" disabled>Seleccionar opción...</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
      </div>
    </div>
  );
};

const Sidebar = ({ currentView, setCurrentView, currentStore }: { currentView: 'dashboard' | 'upload' | 'cart' | 'tracking', setCurrentView: (t: 'dashboard' | 'upload' | 'cart' | 'tracking') => void, currentStore: string | null }) => {
  const { requestList, trackingList } = useCart();
  const isStoreSelected = currentStore && currentStore !== ALL_STORES_ID;

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

        {isStoreSelected && (
          <>
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
          </>
        )}
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
  const [sizeMap, setSizeMap] = useState<Record<string, string>>({});
  const [currentFilters, setCurrentFilters] = useState<{
    marca: string | null;
    tienda: string | null;
    area: string | null;
    categoria: string | null;
  }>({ marca: null, tienda: null, area: null, categoria: null });
  const [subFilters, setSubFilters] = useState({ health: 'all', status: 'all' });
  
  const [isDashboardActive, setIsDashboardActive] = useState(false);
  const [currentSearchTerm, setCurrentSearchTerm] = useState('');
  const [searchTermInput, setSearchTermInput] = useState(''); // Estado local para el input
  const [trackingNotification, setTrackingNotification] = useState<number | null>(null);

  const fetchStockData = async () => {
    console.log("📡 Obteniendo datos de Firebase...", ORGANIZATION_ID);
    setIsLoading(true);
    try {
      const stockRef = collection(db, "organizations", ORGANIZATION_ID, "stock");
      const snapshot = await getDocs(stockRef);
      
      const docs = snapshot.docs.map(doc => doc.data() as NormalizedRow);
      console.log("✅ Datos recuperados:", docs.length);
      
      setData(docs);
      // NO seteamos filteredData aquí, dejamos que el useEffect maestro lo haga
    } catch (error) {
      console.error("❌ Error al obtener datos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStockData();
  }, []);

  // Fetch del mapa de tallas desde Firebase al montar (Centralizado)
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

  // 1. EFECTO DE DEBOUNCE (Solo actualiza el término de búsqueda, NO FILTRA)
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('⏱️ [App] Debounce ejecutado. Nuevo término para filtro:', searchTermInput);
      setCurrentSearchTerm(searchTermInput);
    }, 400); 
    return () => clearTimeout(timer);
  }, [searchTermInput]);

  // Lógica de Redirección (Auto-Redirect)
  useEffect(() => {
    if ((!currentFilters.tienda || currentFilters.tienda === ALL_STORES_ID) && (currentView === 'cart' || currentView === 'tracking')) {
      console.warn('🔒 [App] Redireccionando a Dashboard: Vista global no permitida en operaciones');
      setCurrentView('dashboard');
    }
  }, [currentFilters.tienda, currentView]);

  // 2. EFECTO MAESTRO DE FILTRADO (El Cerebro Central)
  // Escucha cambios en Data, Filtros O Búsqueda y actualiza la tabla UNA sola vez.
  useEffect(() => {
    if (!data) return;

    let result = [...data];

    // A. Aplicar Filtros de Selectores
    if (currentFilters.marca) {
      result = result.filter(item => item.marca === currentFilters.marca);
    }
    
    if (currentFilters.tienda && currentFilters.tienda !== ALL_STORES_ID) {
      result = result.filter(item => item.tiendaNombre === currentFilters.tienda);
    }

    if (currentFilters.area) {
      result = result.filter(item => item.area === currentFilters.area);
    }
    if (currentFilters.categoria) {
      result = result.filter(item => item.categoria === currentFilters.categoria);
    }

    // B. Aplicar Búsqueda (Sobre lo ya filtrado)
    if (currentSearchTerm && currentSearchTerm.trim() !== '') {
      const term = currentSearchTerm.toLowerCase().trim();
      result = result.filter(item => 
        String(item.sku).toLowerCase().includes(term) || 
        String(item.description).toLowerCase().includes(term)
      );
    }

    // C. Actualizar Tabla
    setFilteredData(result);

  }, [data, currentFilters, currentSearchTerm]);


  // Suscripción al Diccionario
  useEffect(() => {
    let unsubscribeFallback: (() => void) | undefined;
    const dictRef = collection(db, "organizations", ORGANIZATION_ID, "product_dictionary");
    
    const unsubscribe = onSnapshot(dictRef, (snapshot) => {
      const dict: Record<string, string> = {};
      snapshot.forEach((doc) => {
        const d = doc.data();
        if (d.sku && d.friendlyName) dict[d.sku.toLowerCase().trim()] = d.friendlyName;
      });
      setProductDictionary(dict);
    }, (error) => {
      console.warn("⚠️ Diccionario de organización no accesible, intentando ruta raíz...", error);
      const fallbackRef = collection(db, "product_dictionary");
      unsubscribeFallback = onSnapshot(fallbackRef, (snapshot) => {
        const dict: Record<string, string> = {};
        snapshot.forEach((doc) => {
          const d = doc.data();
          if (d.sku && d.friendlyName) dict[d.sku.toLowerCase().trim()] = d.friendlyName;
        });
        setProductDictionary(dict);
      });
    });

    return () => {
      unsubscribe();
      if (unsubscribeFallback) unsubscribeFallback();
    };
  }, []);

  const checkForTrackingUpdates = (newData: NormalizedRow[]) => {
    try {
      const storedTracking = localStorage.getItem('fastock_tracking');
      if (!storedTracking) return;

      const trackingList = JSON.parse(storedTracking) as { sku: string }[];
      let updatesCount = 0;

      trackingList.forEach(trackedItem => {
        const variants = newData.filter(d => {
          const parts = d.sku.split('_');
          const base = parts.length >= 2 ? parts.slice(0, 2).join('_').toLowerCase() : d.sku.toLowerCase();
          return base === trackedItem.sku.toLowerCase();
        });

        const totalCD = variants.reduce((sum, v) => sum + (Number(v.stock_cd) || 0), 0);
        const totalTransit = variants.reduce((sum, v) => sum + (Number(v.transit) || 0), 0);

        if (totalCD > 0 || totalTransit > 0) updatesCount++;
      });

      setTrackingNotification(updatesCount > 0 ? updatesCount : null);
    } catch (error) {
      console.error("Error al verificar actualizaciones de seguimiento:", error);
    }
  };

 // =========================================================================
  // LOGIC REPLACEMENT: Módulo de Carga Blindado
  // =========================================================================
  const handleFileUpload = async (normalizedData: NormalizedRow[], type: string) => {
    setIsLoading(true);
    try {
      if (type === 'stock') {
        // 1. Delegamos la subida al Servicio Especialista
        // Esto maneja: limpieza de datos, reintentos y batching.
        console.log("🚀 Iniciando servicio de carga de Stock...");
        await uploadStockBatch(normalizedData, ORGANIZATION_ID);
        
        // 2. Actualizamos la UI localmente (Optimistic Update)
        // Para que el usuario vea los datos sin recargar la página
        setData(normalizedData);
        
        // Si tienes la función de tracking, la llamamos aquí
        if (typeof checkForTrackingUpdates === 'function') {
           checkForTrackingUpdates(normalizedData);
        }
        
        alert(`✅ Éxito: Inventario actualizado correctamente.`);
        
      } else if (type === 'dictionary') {
        // 1. Delegamos al Servicio de Diccionario
        console.log("📘 Iniciando servicio de carga de Diccionario...");
        
        // NOTA: Asumimos que FileUpload o el Parser ya nos dieron la estructura { products, sizes }
        // Si normalizedData viene crudo, el servicio dictionaryService debe manejarlo.
        // Como 'normalizedData' aquí está tipado como NormalizedRow[], usaremos 'any' temporalmente
        // para pasar la data del diccionario hasta que refactoricemos el componente FileUpload.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await uploadDictionaryBatch(normalizedData as any);
        
        alert("✅ Diccionario y Tallas actualizados.");
      }
    } catch (error) {
      console.error("🔥 Error crítico en subida:", error);
      alert("Hubo un error al subir los datos. Revisa la consola para más detalles.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Memorias y Filtros ---

  const uniqueBrands = useMemo(() => {
    return Array.from(new Set(data.map(item => item.marca))).filter(Boolean).sort();
  }, [data]);

  const uniqueStores = useMemo(() => {
    if (!currentFilters.marca) return [];
    const stores = Array.from(new Set(data
      .filter(item => item.marca === currentFilters.marca)
      .map(item => item.tiendaNombre)
    )).filter(Boolean).sort();
    return [ALL_STORES_OPTION, ...stores];
  }, [data, currentFilters.marca]);

  const availableOptions = useMemo(() => {
    if (!currentFilters.marca) return { areas: [], categories: [] };
    let source = data.filter(d => d.marca === currentFilters.marca);
    if (currentFilters.tienda && currentFilters.tienda !== ALL_STORES_ID) {
      source = source.filter(d => d.tiendaNombre === currentFilters.tienda);
    }
    let categorySource = source;
    if (currentFilters.area) {
      categorySource = source.filter(d => d.area === currentFilters.area);
    }
    return {
      areas: Array.from(new Set(source.map(i => i.area))).filter(Boolean).sort(),
      categories: Array.from(new Set(categorySource.map(i => i.categoria))).filter(Boolean).sort()
    };
  }, [data, currentFilters.marca, currentFilters.tienda, currentFilters.area]);

  // HANDLER SIMPLIFICADO: Solo actualiza el estado de filtros
  const handleFilterChange = (filters: Partial<{ marca: string | null; tienda: string | null; area: string | null; categoria: string | null }>) => {
    const safeFilters = { ...currentFilters, ...filters };
    
    if (safeFilters.tienda === ALL_STORES_OPTION || safeFilters.tienda === 'Todas las Tiendas') {
       safeFilters.tienda = ALL_STORES_ID;
    }

    if (isDashboardActive) {
        if (!safeFilters.marca) { /* Mantenemos lógica opcional */ }
        if (safeFilters.marca && !safeFilters.tienda) {
            safeFilters.tienda = ALL_STORES_ID; 
        }
    }

    if (safeFilters.tienda) {
        setIsDashboardActive(true);
    } else {
        setIsDashboardActive(false);
    }
    
    // Cascada de Limpieza
    if (filters.marca && filters.marca !== currentFilters.marca) {
        safeFilters.tienda = null; 
        safeFilters.area = null;
        safeFilters.categoria = null;
    }

    setCurrentFilters(safeFilters);
    // ¡YA NO FILTRAMOS AQUÍ! El useEffect maestro se encarga.
  };

  // HANDLER SIMPLIFICADO: Solo actualiza el input
  const handleSearch = (searchTerm: string) => {
    console.log('🔍 [App] handleSearch recibido:', searchTerm);
    setSearchTermInput(searchTerm);
  };

  const handleBackToStores = () => {
    // 1. PRIMERO: Salimos de la vista del Dashboard.
    // Esto evita que la lógica de validación de filtros intente "corregirnos".
    setIsDashboardActive(false);
    
    // 2. SEGUNDO: Limpiamos la tienda (pero mantenemos la marca).
    setCurrentFilters(prev => ({ 
      ...prev, 
      tienda: null, 
      area: null, 
      categoria: null 
    }));
    
    // 3. Limpiamos el buscador.
    setCurrentSearchTerm('');
    setSearchTermInput('');
    setSubFilters({ health: 'all', status: 'all' });
  };

  // =========================================================================
  // 4. PIPELINE DE TRANSFORMACIÓN (Data Cruda -> Data Inteligente)
  // =========================================================================
  // Este hook hace la magia: Agrupa por SKU padre, suma stocks y calcula semáforos.
  const groupedProducts = useStockGrouping(
    data,                     // Data cruda de Firebase (NormalizedRow)
    productDictionary,        // Tu diccionario de nombres (estado productDictionary)
    sizeMap,                  // Tu mapa de tallas (estado sizeMap)
    currentSearchTerm,        // Lo que el usuario escribe en la barra (string)
    currentFilters.tienda === ALL_STORES_ID // ¿Estamos viendo todas las tiendas? (true/false)
  );

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
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} currentStore={currentFilters.tienda} />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="absolute top-6 right-8 z-30">
           <NotificationBell 
             count={trackingNotification} 
             onClick={() => setCurrentView('tracking')} 
           />
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {currentView === 'dashboard' && (
            <>
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
              ) : !isDashboardActive ? (
                 !currentFilters.marca ? (
                    <WelcomeScreen 
                      step="brand"
                      instruction="Selecciona Una Marca Para Comenzar"
                      options={uniqueBrands}
                      onSelect={(brand) => handleFilterChange({ ...currentFilters, marca: brand })}
                    />
                 ) : (
                    <WelcomeScreen 
                      step="store"
                      instruction="Selecciona Una Tienda Para Continuar"
                      options={uniqueStores}
                      onSelect={(store) => handleFilterChange({ ...currentFilters, tienda: store })}
                      onBack={() => handleFilterChange({ ...currentFilters, marca: null })}
                    />
                 )
              ) : (
                <>
                  <div className="flex items-center justify-between mb-6 ml-[52px] mr-8">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800">Tablero de Control</h2>
                      <p className="text-sm text-gray-500 mt-1">
                        Tienda: <span className="font-bold text-blue-600">{currentFilters.tienda === 'all' ? 'Todas las Tiendas' : currentFilters.tienda}</span>
                      </p>
                    </div>
                    <button
                      onClick={handleBackToStores}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
                    >
                      <span>⬅</span> Cambiar Tienda
                    </button>
                  </div>
                  <DashboardFilters 
                    data={data} 
                    onFilter={handleFilterChange} 
                    onSearch={handleSearch} 
                    selectedFilters={currentFilters} 
                    areas={availableOptions.areas}
                    categories={availableOptions.categories}
                  />
                  <StockHealthFilters 
                    filters={subFilters} 
                    onChange={setSubFilters} 
                  />
                  <div className="min-h-[500px] transition-all duration-300">
                    <StockTable 
                      data={filteredData} 
                      productDictionary={productDictionary} 
                      isMultiStore={currentFilters.tienda === ALL_STORES_ID}
                      searchTerm={currentSearchTerm}
                      currentStoreName={currentFilters.tienda || 'Global'}
                      subFilters={subFilters}
                      sizeMap={sizeMap}
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
                <FileUpload onUpload={handleFileUpload} />
              </div>
            </div>
          )}

          {currentView === 'cart' && (
            <div className="max-w-7xl mx-auto mt-4">
              <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
                Carrito de Solicitud
                {currentFilters.tienda && (
                  <span className="text-sm font-normal bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                    {currentFilters.tienda === 'all' ? 'Todas las Tiendas' : currentFilters.tienda}
                  </span>
                )}
              </h2>
              {/* INYECCIÓN DE CONTEXTO */}
              <RequestCartView 
                data={data} 
                currentStore={currentFilters.tienda} 
              />
            </div>
          )}

          {currentView === 'tracking' && (
            <div className="max-w-7xl mx-auto mt-4">
              <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
                Lista de Seguimiento
                {currentFilters.tienda && (
                  <span className="text-sm font-normal bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                    {currentFilters.tienda === 'all' ? 'Todas las Tiendas' : currentFilters.tienda}
                  </span>
                )}
              </h2>
              {/* INYECCIÓN DE CONTEXTO */}
              <TrackingListView 
                currentData={groupedProducts} // <--- CORRECCIÓN: Pasamos la data procesada
                currentStore={currentFilters.tienda || ''} // <--- CORRECCIÓN: Evitamos que pase null
                sizeMap={sizeMap}
                onToggleStar={() => {}} // Props temporales necesarios
                starredSkus={new Set()} // Props temporales necesarios
              />
            </div>
          )}
        </div>
      </main>
    </div>
    </CartProvider>
  );
}

export default App;