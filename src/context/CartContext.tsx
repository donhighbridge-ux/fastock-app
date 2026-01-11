import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface CartItem {
  sku: string;
  sizes: string[];
  area: string;
  description: string;
  timestamp: number;
}

export interface TrackingItem {
  sku: string;
  description: string;
  timestamp: number;
}

interface CartContextType {
  requestList: CartItem[];
  trackingList: TrackingItem[];
  addToRequest: (item: CartItem) => void;
  addToTracking: (item: TrackingItem) => void;
  removeFromRequest: (sku: string) => void;
  removeFromTracking: (sku: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [requestList, setRequestList] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('fastock_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [trackingList, setTrackingList] = useState<TrackingItem[]>(() => {
    const saved = localStorage.getItem('fastock_tracking');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('fastock_cart', JSON.stringify(requestList));
  }, [requestList]);

  useEffect(() => {
    localStorage.setItem('fastock_tracking', JSON.stringify(trackingList));
  }, [trackingList]);

  const addToRequest = (item: CartItem) => {
    setRequestList((prev) => {
      // Si el SKU ya existe, fusionamos las tallas para evitar duplicados
      const existingIndex = prev.findIndex((i) => i.sku === item.sku);
      if (existingIndex >= 0) {
        const updated = [...prev];
        const mergedSizes = Array.from(new Set([...updated[existingIndex].sizes, ...item.sizes]));
        updated[existingIndex] = { ...updated[existingIndex], sizes: mergedSizes, timestamp: Date.now() };
        return updated;
      }
      return [...prev, item];
    });
  };

  const addToTracking = (item: TrackingItem) => {
    setTrackingList((prev) => {
      if (prev.some((i) => i.sku === item.sku)) return prev;
      return [...prev, item];
    });
  };

  const removeFromRequest = (sku: string) => {
    setRequestList((prev) => prev.filter((item) => item.sku !== sku));
  };

  const removeFromTracking = (sku: string) => {
    setTrackingList((prev) => prev.filter((item) => item.sku !== sku));
  };

  return (
    <CartContext.Provider value={{ requestList, trackingList, addToRequest, addToTracking, removeFromRequest, removeFromTracking }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};