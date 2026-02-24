import React, { useState, useEffect, type ReactNode } from 'react';
import { CartContext, type CartItem, type TrackingItem } from './useCart';

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
      const type = item.requestType || 'stock';
      const existingIndex = prev.findIndex(
        (i) => i.sku === item.sku && 
               i.originStore === item.originStore && 
               (i.requestType || 'stock') === type
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        const existingItem = updated[existingIndex];
        const mergedSizes = Array.from(new Set([...existingItem.sizes, ...item.sizes]));
        const mergedRaMap = { ...(existingItem.proposedRaMap || {}), ...(item.proposedRaMap || {}) };

        updated[existingIndex] = { 
          ...existingItem, 
          sizes: mergedSizes, 
          proposedRaMap: mergedRaMap,
          timestamp: Date.now() 
        };
        return updated;
      }
      return [...prev, { ...item, requestType: type }];
    });
  };

  const addToTracking = (item: TrackingItem) => {
    setTrackingList((prev) => {
      if (prev.some((i) => i.sku === item.sku && i.originStore === item.originStore)) return prev;
      return [...prev, item];
    });
  };

  const removeFromRequest = (sku: string, originStore?: string, requestType: 'stock' | 'ra' = 'stock') => {
    setRequestList((prev) => prev.filter((item) => {
      const matchSku = item.sku === sku;
      const matchStore = originStore ? item.originStore === originStore : true;
      const matchType = (item.requestType || 'stock') === requestType;
      return !(matchSku && matchStore && matchType);
    }));
  };

  const removeFromTracking = (sku: string, originStore?: string) => {
    setTrackingList((prev) => prev.filter((item) => {
      if (originStore) {
        return !(item.sku === sku && item.originStore === originStore);
      }
      return item.sku !== sku;
    }));
  };

  return (
    <CartContext.Provider value={{ requestList, trackingList, addToRequest, addToTracking, removeFromRequest, removeFromTracking }}>
      {children}
    </CartContext.Provider>
  );
};
