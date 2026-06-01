import { useState } from 'react';
import type { StoreSector, Point2D } from '../types';
import { getDistanceBetweenPoints } from '../utils/geometry';

export const useSectorDrawing = () => {
  const [sectors, setSectors] = useState<StoreSector[]>([]);
  const [currentPolygon, setCurrentPolygon] = useState<Point2D[]>([]);

  /**
   * Registra un punto en el lienzo coordinando la lógica Impar/Par
   * @param x Coordenada X relativa al tamaño nativo del plano
   * @param y Coordenada Y relativa al tamaño nativo del plano
   * * @param color Tinta opcional para pintar la línea permanentemente
   */
  const addPoint = (x: number, y: number, color?: string) => {
    // 🎯 PRIMER CLIC: Nace un nuevo polígono
    if (currentPolygon.length === 0) {
      setCurrentPolygon([{ x, y }]);
      console.log(`[useSectorDrawing] Vértice 1: Origen fijado en X: ${Math.round(x)}, Y: ${Math.round(y)}`);
      return;
    }

    const firstPoint = currentPolygon[0];
    const distanceToOrigin = getDistanceBetweenPoints({ x, y }, firstPoint);
    const MAGNETIC_RADIUS = 25; // 🧲 Píxeles de atracción del imán

    // 🏁 CIERRE: Si hace click cerca del origen y tiene al menos 3 puntos, consolida el sector
    if (currentPolygon.length >= 3 && distanceToOrigin < MAGNETIC_RADIUS) {
      const newSector: StoreSector = {
        id: `sector_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        points: [...currentPolygon], // Guardamos la cadena infinita
        color: color
      };

      setSectors(prev => [...prev, newSector]);
      setCurrentPolygon([]);
      console.log(`[useSectorDrawing] 🧲 Cierre Magnético: Sector consolidado con ${currentPolygon.length} vértices.`);
    } else {
      // 🔗 CONTINUACIÓN: Simplemente agrega otro vértice a la cadena
      setCurrentPolygon(prev => [...prev, { x, y }]);
      console.log(`[useSectorDrawing] Vértice ${currentPolygon.length + 1} agregado.`);
    }
  };

  /**
   * Cancela el trazo actual en caso de que el usuario se arrepienta a mitad de camino
   */
  const cancelCurrentLine = () => {
    if (currentPolygon.length > 0) {
      console.log('[useSectorDrawing] Polígono incompleto cancelado por el usuario.');
      setCurrentPolygon([]);
    }
  };

  /**
   * Elimina el último vértice dibujado sin perder todo el progreso (Undo)
   */
  const undoLastPoint = () => {
    setCurrentPolygon(prev => {
      if (prev.length === 0) return prev;
      console.log(`[useSectorDrawing] ⏪ Vértice deshecho. Quedan ${prev.length - 1} puntos.`);
      return prev.slice(0, -1);
    });
  };

  /**
   * Limpia la mesa de dibujo por completo
   */
  const clearAllLines = () => {
    console.log('[useSectorDrawing] Limpiando todos los sectores vectoriales.');
    setSectors([]);
    setCurrentPolygon([]);
  };

  return {
    sectors,
    currentPolygon,
    isDrawingActive: currentPolygon.length > 0, 
    addPoint,
    cancelCurrentLine,
    undoLastPoint,
    clearAllLines,
    setSectors
  };
};
