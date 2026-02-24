import { createContext, useContext } from 'react';

// 1. Exportamos los Tipos (El ADN)
export interface CartItem {
  sku: string;
  sizes: string[];
  area: string;
  description: string;
  timestamp: number;
  originStore?: string;
  requestType?: 'stock' | 'ra'; 
  proposedRaMap?: Record<string, number>; 
}

export interface TrackingItem {
  sku: string;
  description: string;
  timestamp: number;
  originStore?: string;
}

export interface CartContextType {
  requestList: CartItem[];
  trackingList: TrackingItem[];
  addToRequest: (item: CartItem) => void;
  addToTracking: (item: TrackingItem) => void;
  removeFromRequest: (sku: string, originStore?: string, requestType?: 'stock' | 'ra') => void;
  removeFromTracking: (sku: string, originStore?: string) => void;
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
