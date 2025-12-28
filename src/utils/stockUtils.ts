export const getCleanSize = (rawSize: string, sizeMap: Record<string, string>): string => {
  if (!rawSize) return '';
  // Paso 1: Extracción - texto después del último guion bajo
  const lastUnderscoreIndex = rawSize.lastIndexOf('_');
  const extracted = lastUnderscoreIndex !== -1 
    ? rawSize.substring(lastUnderscoreIndex + 1) 
    : rawSize;

  // Paso 2: Diccionario (Lookup) - Si el mapa está vacío o no encuentra key, devuelve extracted
  return sizeMap[extracted] || extracted;
};