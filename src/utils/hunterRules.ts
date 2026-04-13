// src/utils/hunterRules.ts

export const getCarryover = (season: string) => {
  const match = season.match(/^([A-Z]+)(\d{4})$/);
  if (!match) return 'N/A';
  return `${match[1]}${parseInt(match[2]) - 1}`;
};

export const getBestRatio = (actualSizeCount: number, expectedSizes: number, mode2?: number | null) => {
  let ratio = actualSizeCount / expectedSizes;
  if (mode2 && mode2 > 0) {
    ratio = Math.max(ratio, actualSizeCount / mode2);
  }
  return ratio;
};

export const isCurrentOrBasicSeason = (season: string, currentSeason: string) => {
  const cleanSeason = season?.trim().toUpperCase() || 'SIN TEMPORADA';
  return ['BÁSICO', 'BÁSICOS', 'BASICO', 'BASICOS'].includes(cleanSeason) || cleanSeason === currentSeason;
};
