import { useState } from 'react';

export interface Point2D {
  x: number;
  y: number;
}

export interface DrawingLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export const useSectorDrawing = () => {
  const [lines, setLines] = useState<DrawingLine[]>([]);
  const [startPoint, setStartPoint] = useState<Point2D | null>(null);

  /**
   * Registra un punto en el lienzo coordinando la lógica Impar/Par
   * @param x Coordenada X relativa al tamaño nativo del plano
   * @param y Coordenada Y relativa al tamaño nativo del plano
   */
  const addPoint = (x: number, y: number) => {
    if (!startPoint) {
      // 🎯 CLICK IMPAR: Nacimiento de la línea
      const newStart = { x, y };
      setStartPoint(newStart);
      console.log(`[useSectorDrawing] Click Impar (Nacimiento): Origen fijado en X: ${Math.round(x)}, Y: ${Math.round(y)}`);
    } else {
      // 🏁 CLICK PAR: Cierre y consolidación de la línea
      const newLine: DrawingLine = {
        id: `line_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        x1: startPoint.x,
        y1: startPoint.y,
        x2: x,
        y2: y
      };

      setLines(prev => [...prev, newLine]);
      setStartPoint(null); // Resetea el interruptor para la siguiente línea
      console.log(`[useSectorDrawing] Click Par (Cierre): Línea consolidada. Total en memoria: ${lines.length + 1}`);
    }
  };

  /**
   * Cancela el trazo actual en caso de que el usuario se arrepienta a mitad de camino
   */
  const cancelCurrentLine = () => {
    if (startPoint) {
      console.log('[useSectorDrawing] Trazo incompleto cancelado por el usuario.');
      setStartPoint(null);
    }
  };

  /**
   * Limpia la mesa de dibujo por completo
   */
  const clearAllLines = () => {
    console.log('[useSectorDrawing] Limpiando todas las líneas vectoriales del sector.');
    setLines([]);
    setStartPoint(null);
  };

  return {
    lines,
    startPoint,
    isDrawingActive: startPoint !== null, // Verdadero si hay una línea flotando esperando el segundo click
    addPoint,
    cancelCurrentLine,
    clearAllLines,
    setLines
  };
};
