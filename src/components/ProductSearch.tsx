import React, { useState } from 'react';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase-config';
import Logger from '../utils/logger';

// Definimos los tipos para los resultados de la búsqueda
interface StockEntry {
  tiendaNombre: string;
  stockTienda: number;
  size: string; // Código de talla técnico
  friendlySize?: string; // Talla amigable traducida
}

interface SearchResult {
  friendlyName: string;
  stock: StockEntry[];
}

const ProductSearch = () => {
  const [sku, setSku] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!sku.trim()) {
      setError('Por favor, ingresa un SKU.');
      return;
    }

    setIsLoading(true);
    setError('');
    setSearchResult(null);
    const searchTerm = sku.trim();

    try {
      // Paso 1 & 3: Obtener el nombre del producto y el mapa de tallas en paralelo
      const [productSnap, configSnap] = await Promise.all([
        getDoc(doc(db, 'product_dictionary', searchTerm)),
        getDoc(doc(db, 'configuration', 'general'))
      ]);

      const friendlyName = productSnap.exists() ? productSnap.data().friendlyName : searchTerm;
      const sizeMap = configSnap.exists() ? configSnap.data().sizeMap : {};

      // Paso 2: Buscar en el inventario todos los documentos cuyo SKU comience con el término de búsqueda
      const stockCol = collection(db, 'organizations/komax_chile/stock');
      const q = query(
        stockCol,
        where('sku', '>=', searchTerm),
        where('sku', '<=', searchTerm + '\uf8ff'),
        orderBy('sku') // Ordenar por SKU para agrupar tallas
      );

      const stockQuerySnapshot = await getDocs(q);

      if (stockQuerySnapshot.empty) {
        setError('No se encontró stock para este SKU.');
        setIsLoading(false);
        return;
      }

      // Procesar y traducir tallas
      const stockEntries: StockEntry[] = stockQuerySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          tiendaNombre: data.tiendaNombre,
          stockTienda: data.stockTienda,
          size: data.size,
          friendlySize: sizeMap[data.size] || data.size, // Traducir o usar el código original
        };
      });

      // Agrupar por tienda para una mejor visualización
      stockEntries.sort((a, b) => a.tiendaNombre.localeCompare(b.tiendaNombre));

      setSearchResult({ friendlyName, stock: stockEntries });

    } catch (err: any) {
      Logger.error('Error durante la búsqueda:', err);
      setError('Ocurrió un error al buscar los datos. Revisa la consola.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '2rem' }}>
      <h2>Buscar Stock por SKU</h2>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
        <input
          type="text"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          placeholder="Ingresa un SKU (ej: 488386)"
          style={{ padding: '8px', flexGrow: 1 }}
        />
        <button onClick={handleSearch} disabled={isLoading} style={{ padding: '8px 16px' }}>
          {isLoading ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {searchResult && (
        <div>
          <h3>{searchResult.friendlyName}</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f4f4f4' }}>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Tienda</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Talla</th>
                <th style={{ padding: '8px', border: '1px solid #ddd' }}>Stock</th>
              </tr>
            </thead>
            <tbody>
              {searchResult.stock.map((item, index) => (
                <tr key={index}>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{item.tiendaNombre}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{item.friendlySize}</td>
                  <td style={{ padding: '8px', border: '1px solid #ddd' }}>{item.stockTienda}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ProductSearch;