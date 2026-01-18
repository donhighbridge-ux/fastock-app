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
import NotificationBell from './components/NotificationBell';
import './App.css';

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
            // TRUCO CLAVE: La 'key' fuerza a React a recrear el input si cambian las opciones o el paso.
            // Esto resetea el estado interno del navegador y permite volver a seleccionar.
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
          {/* Flecha visual personalizada para indicar que es un dropdown */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
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
  
  // NUEVO ESTADO (La Memoria): Controla si el usuario ya ingresó al Dashboard
  const [isDashboardActive, setIsDashboardActive] = useState(false);
  const [currentSearchTerm, setCurrentSearchTerm] = useState('');
  const [trackingNotification, setTrackingNotification] = useState<number | null>(null);

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

  // --- Lógica de Notificación Inteligente ---
  const checkForTrackingUpdates = (newData: NormalizedRow[]) => {
    try {
      // Intentamos leer la lista de seguimiento del localStorage
      // Asumimos que el CartContext persiste la lista bajo la clave 'trackingList'
      const storedTracking = localStorage.getItem('trackingList');
      if (!storedTracking) return;

      const trackingList = JSON.parse(storedTracking) as { sku: string }[];
      let updatesCount = 0;

      trackingList.forEach(trackedItem => {
        // Lógica de Cruce: Buscar variantes en la nueva data
        const variants = newData.filter(d => {
          const parts = d.sku.split('_');
          const base = parts.length >= 2 ? parts.slice(0, 2).join('_').toLowerCase() : d.sku.toLowerCase();
          return base === trackedItem.sku.toLowerCase();
        });

        const totalCD = variants.reduce((sum, v) => sum + (Number(v.stock_cd) || 0), 0);
        const totalTransit = variants.reduce((sum, v) => sum + (Number(v.transit) || 0), 0);

        if (totalCD > 0 || totalTransit > 0) {
          updatesCount++;
        }
      });

      setTrackingNotification(updatesCount > 0 ? updatesCount : null);
    } catch (error) {
      console.error("Error al verificar actualizaciones de seguimiento:", error);
    }
  };

const handleFileUpload = async (normalizedData: NormalizedRow[], type: string) => {
    setIsLoading(true);
    try {
      const collectionName = type === 'stock' ? 'stock' : 'product_dictionary';
      const collectionRef = collection(db, "organizations", ORGANIZATION_ID, collectionName);
      
      // CONFIGURACIÓN DE SEGURIDAD (La que definimos hace meses)
      const BATCH_SIZE = 400; // Bajamos de 500 a 400 para evitar errores de tamaño/timeout
      const DELAY_MS = 50;    // Pequeña pausa para no saturar el ancho de banda
      
      // =================================================================
      // 1. LIMPIEZA PREVIA INTELIGENTE (BORRADO POR LOTES)
      // =================================================================
      console.log("🧹 Iniciando limpieza de datos antiguos...");
      const snapshot = await getDocs(collectionRef);
      const totalDocsToDelete = snapshot.docs.length;
      
      if (totalDocsToDelete > 0) {
        // Dividimos los documentos a borrar en chunks
        const deleteChunks = [];
        for (let i = 0; i < totalDocsToDelete; i += BATCH_SIZE) {
          deleteChunks.push(snapshot.docs.slice(i, i + BATCH_SIZE));
        }

        let deletedCount = 0;
        for (const chunk of deleteChunks) {
          const batchDelete = writeBatch(db);
          chunk.forEach((doc) => batchDelete.delete(doc.ref));
          await batchDelete.commit();
          
          deletedCount += chunk.length;
          console.log(`🗑️ Borrados ${deletedCount}/${totalDocsToDelete} registros antiguos.`);
          // Pequeña pausa para respirar
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
      }

      // =================================================================
      // 2. ESCRITURA POR LOTES (SUBIDA CONTROLADA)
      // =================================================================
      console.log(`🚀 Iniciando carga de ${normalizedData.length} nuevos registros...`);
      let totalUploaded = 0;

      for (let i = 0; i < normalizedData.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = normalizedData.slice(i, i + BATCH_SIZE);
        
        chunk.forEach((row) => {
          const docRef = doc(collectionRef); 
          batch.set(docRef, row);
        });

        await batch.commit();
        
        totalUploaded += chunk.length;
        const porcentaje = Math.round((totalUploaded / normalizedData.length) * 100);
        console.log(`⏳ Subiendo... ${totalUploaded}/${normalizedData.length} filas (${porcentaje}%).`);
        
        // Pausa anti-saturación
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }

      // 3. ACTUALIZAR ESTADO LOCAL
      if (type === 'stock') {
        setData(normalizedData);
        setFilteredData(normalizedData);
        checkForTrackingUpdates(normalizedData);
      }
      
      console.log(`✅ PROCESO FINALIZADO CON ÉXITO.`);

    } catch (error) {
      console.error("❌ Error CRÍTICO al guardar en Firebase:", error);
      alert("Hubo un error al subir los datos. Revisa la consola para más detalles.");
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

  // 3. Calcular Opciones de Filtro (Área y Categoría)
  const availableOptions = useMemo(() => {
    if (!currentFilters.marca) return { areas: [], categories: [] };

    let source = data.filter(d => d.marca === currentFilters.marca);

    // Filtro base por Tienda (si aplica)
    if (currentFilters.tienda && currentFilters.tienda !== ALL_STORES_ID) {
      source = source.filter(d => d.tiendaNombre === currentFilters.tienda);
    }

    // Para categorías, aplicamos un filtro adicional por Área si está seleccionada (Cascada)
    let categorySource = source;
    if (currentFilters.area) {
      categorySource = source.filter(d => d.area === currentFilters.area);
    }

    return {
      areas: Array.from(new Set(source.map(i => i.area))).filter(Boolean).sort(),
      categories: Array.from(new Set(categorySource.map(i => i.categoria))).filter(Boolean).sort()
    };
  }, [data, currentFilters.marca, currentFilters.tienda, currentFilters.area]);

  const handleFilterChange = (filters: Partial<{ marca: string | null; tienda: string | null; area: string | null; categoria: string | null }>) => {
    const safeFilters = { ...currentFilters, ...filters };
    
    // 1. LIMPIEZA DE "TODAS LAS TIENDAS" (String -> ID Lógico)
    // Atrapamos el objeto, el string literal o el ID 'all'
    if (
        safeFilters.tienda === ALL_STORES_OPTION || 
        (typeof safeFilters.tienda === 'object' && safeFilters.tienda !== null) ||
        safeFilters.tienda === 'Todas las Tiendas'
    ) {
       safeFilters.tienda = ALL_STORES_ID;
    }

    // 2. PROTECCIÓN DE SESIÓN (Anti-Kickback)
    // Si ya estamos dentro del dashboard...
    if (isDashboardActive) {
        // ...y el usuario borró la marca (seleccionó "Todas las Marcas")...
        if (!safeFilters.marca) {
            // Mantenemos la tienda actual o ponemos 'all', pero NO salimos.
            // Opcional: Si quieres ver todo global, podrías dejar marca null y tienda 'all'.
        }
        
        // ...o si cambió de marca y la tienda quedó huérfana (null)...
        if (safeFilters.marca && !safeFilters.tienda) {
            safeFilters.tienda = ALL_STORES_ID; // Forzamos "Todas" para no romper la vista
        }
    }

    // 3. ACTIVACIÓN DEL DASHBOARD (Tarjeta de Acceso)
    // Si seleccionó una tienda válida (específica o 'all'), ¡Adentro!
    if (safeFilters.tienda) {
        setIsDashboardActive(true);
    }
    
    // NOTA: ELIMINAMOS LA LÍNEA QUE HACÍA setIsDashboardActive(false). 
    // Una vez dentro, no te sacamos.

    // 4. ACTUALIZAR ESTADO
    setCurrentFilters(safeFilters);
    
    // 5. FILTRADO DE DATOS (Lógica de Negocio)
    let newData = [...data];

    // Filtro Marca
    if (safeFilters.marca) {
      newData = newData.filter(item => item.marca === safeFilters.marca);
    }
    
    // Filtro Tienda (Solo si NO es 'all')
    if (safeFilters.tienda && safeFilters.tienda !== ALL_STORES_ID) {
      newData = newData.filter(item => item.tiendaNombre === safeFilters.tienda);
    }

    // Filtros secundarios
    if (safeFilters.area) newData = newData.filter(item => item.area === safeFilters.area);
    if (safeFilters.categoria) newData = newData.filter(item => item.categoria === safeFilters.categoria);

    setFilteredData(newData);
  };

  const handleSearch = (searchTerm: string) => {
    setCurrentSearchTerm(searchTerm);
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
        {/* Header Flotante para Notificaciones */}
        <div className="absolute top-6 right-8 z-30">
           <NotificationBell 
             count={trackingNotification} 
             onClick={() => setCurrentView('tracking')} 
           />
        </div>

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
              ) : !isDashboardActive ? (
                /* PORTERO: Si no está activo el dashboard, mostramos flujo de bienvenida */
                 !currentFilters.marca ? (
                    /* ESTADO UNO: Selección de Marca */
                    <WelcomeScreen 
                      step="brand"
                      instruction="Selecciona Una Marca Para Comenzar"
                      options={uniqueBrands}
                      onSelect={(brand) => handleFilterChange({ ...currentFilters, marca: brand })}
                    />
                 ) : (
                    /* ESTADO DOS: Selección de Tienda */
                    <WelcomeScreen 
                      step="store"
                      instruction="Selecciona Una Tienda Para Continuar"
                      options={uniqueStores}
                      onSelect={(store) => handleFilterChange({ ...currentFilters, tienda: store })}
                      onBack={() => handleFilterChange({ ...currentFilters, marca: null })}
                    />
                 )
              ) : (
                /* ESTADO TRES: El Dashboard (Solo si isDashboardActive es true) */
                <>
                  <h2 className="text-2xl font-bold mb-4 text-gray-800 ml-[52px]">Tablero de Control</h2>
                  <DashboardFilters 
                    data={data} 
                    onFilter={handleFilterChange} 
                    onSearch={handleSearch} 
                    selectedFilters={currentFilters} 
                    areas={availableOptions.areas}
                    categories={availableOptions.categories}
                  />
                  <div className="min-h-[500px] transition-all duration-300">
                    <StockTable 
                      data={filteredData} 
                      productDictionary={productDictionary} 
                      isMultiStore={currentFilters.tienda === ALL_STORES_ID}
                      searchTerm={currentSearchTerm}
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
