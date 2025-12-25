/**
 * Un mapa para traducir códigos de talla técnicos a nombres amigables.
 * Esta es nuestra "Piedra de Rosetta" para las tallas.
 */
export const SIZE_MAP: { [key: string]: string } = {
  // Tallas de Adulto
  'M030000': 'XS',
  'M030001': 'S',
  'M030002': 'M',
  'M030003': 'L',
  'M030004': 'XL',
  'M030005': 'XXL',
  // Tallas Numéricas (ej. Pantalones)
  'M040028': '28',
  'M040030': '30',
  'M040032': '32',
  // ... agregar más mapeos según sea necesario
};

/**
 * Obtiene la talla amigable a partir de un código técnico.
 * Si no se encuentra una traducción, devuelve el código original.
 * @param technicalCode - El código de talla técnico (ej. 'M030001').
 * @returns La talla amigable (ej. 'S') o el código original.
 */
export const getFriendlySize = (technicalCode: string): string => {
  return SIZE_MAP[technicalCode] || technicalCode;
};