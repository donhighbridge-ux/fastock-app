export interface NormalizedRow {
  sku: string;
  description: string;
  stock: string | number;
  transit: string | number;
  stock_cd: string | number;
  sales2w: string | number;
  ra: string | number;
  [key: string]: any;
}

export type StockStatus = 'STOCK OK' | 'NADA EN EL CD' | 'EN TRÁNSITO' | 'PIDE SOLO...';

export interface StockHealth {
  status: StockStatus;
  emoji: string;
  details: {
    coming: string[];
    request: string[];
    dead: string[];
  };
}