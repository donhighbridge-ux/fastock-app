import { createContext, useContext } from 'react';

// 1. Exportamos los Tipos (El ADN)
export interface CartItem {
  sku: string;
  sizes: string[];
  sizeQuantities?: Record<string, number>; // 🟢 Registro del diferencial (Venta - Stock)
  area: string;
  category: string; // 🟢 Guarda la categoría
  categoryHealth?: string[]; // 🟢 Guarda la Hit List y el diagnóstico
  salesPulse?: number;       // 🟢 Guarda el total vendido en otras tiendas
  description: string;
  timestamp: number;
  originStore?: string;
  requestType?: 'stock' | 'ra' | 'opportunity' | 'ultimas';
  proposedRaMap?: Record<string, number>; 
}

export interface TrackingItem {
  sku: string;
  description: string;
  sizes: string[];
  area: string;
  category: string;
  timestamp: number;
  originStore?: string;
}

export interface CartContextType {
  requestList: CartItem[];
  trackingList: TrackingItem[];
  addToRequest: (item: CartItem) => void;
  addToTracking: (item: TrackingItem) => void;
  removeFromRequest: (sku: string, originStore?: string, requestType?: 'stock' | 'ra' | 'opportunity' | 'ultimas') => void;
  removeFromTracking: (sku: string, originStore?: string) => void;
  clearRequest: (originStore?: string) => void;
}

// 2. Exportamos el Contexto
export const CartContext = createContext<CartContextType | undefined>(undefined);

// 3. Exportamos el Hook (La función)
export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
