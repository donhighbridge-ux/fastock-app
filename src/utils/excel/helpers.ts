import type { CartItem } from '../../context/useCart';
import type { NormalizedRow } from '../../types';

export const agruparPorArea = (items: CartItem[]) => {
  return items.reduce((acc, item) => {
    const area = item.area || 'Sin Área';
    if (!acc[area]) acc[area] = [];
    acc[area].push(item);
    return acc;
  }, {} as Record<string, CartItem[]>);
};

export const limpiarNombrePestaña = (nombre: string) => {
  return nombre.substring(0, 31).replace(/[\\/*?:[\]]/g, '');
};

export const calcularVenta2wEstilo = (curvaCompleta: NormalizedRow[]) => {
  return curvaCompleta.reduce((total, fila) => {
    return total + (Number(fila.sales2w) || 0);
  }, 0);
};
