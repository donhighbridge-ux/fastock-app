import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, getDocs, writeBatch, doc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase-config';
import { CartProvider } from './context/CartContext';
import FileUpload from './components/FileUpload';
import ProductSearch from './components/ProductSearch';
import DashboardFilters from './components/Dashboard/DashboardFilters';
import StockTable from './components/StockTable';
import type { NormalizedRow } from './types';
import './App.css';

const ORGANIZATION_ID = "demo_org_v1";

function App() {
    const [data, setData] = useState<NormalizedRow[]>([]);
  const [filteredData, setFilteredData] = useState<NormalizedRow[]>(data);
  const [isLoading, setIsLoading] = useState(true);
  const [productDictionary, setProductDictionary] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'dashboard' | 'upload'>('dashboard');
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

  const handleFilterChange = (filters: { marca: string | null; tienda: string | null; area: string | null; categoria: string | null }) => {
    // Apply cascading filters
    setCurrentFilters(filters);
    let newData = [...data];

    if (filters.marca) newData = newData.filter(item => item.marca === filters.marca);
    if (filters.tienda) newData = newData.filter(item => item.tiendaNombre === filters.tienda);
    if (filters.area) newData = newData.filter(item => item.area === filters.area);
    if (filters.categoria) newData = newData.filter(item => item.categoria === filters.categoria);

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
      <aside className="w-64 bg-slate-900 flex-shrink-0 flex flex-col h-full text-white border-r border-slate-800 shadow-xl z-20">
        <div className="p-6">
          <h1 className="text-2xl font-bold">FASTock Admin</h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
              activeTab === 'dashboard' ? 'bg-slate-800 text-white' : 'text-gray-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            📊 Tablero
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
              activeTab === 'upload' ? 'bg-slate-800 text-white' : 'text-gray-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            📤 Carga de Datos
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'dashboard' ? (
            <>
              <h2 className="text-2xl font-bold mb-4 text-gray-800 ml-[52px]">Tablero de Control</h2>
              <DashboardFilters 
                data={data} 
                onFilter={handleFilterChange} 
                onSearch={handleSearch} 
                selectedFilters={currentFilters} 
              />
              <div className="min-h-[500px] transition-all duration-300">
                <StockTable data={filteredData} productDictionary={productDictionary} />
              </div>
            </>
          ) : (
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
        </div>
      </main>
    </div>
    </CartProvider>
  );
}

export default App;
