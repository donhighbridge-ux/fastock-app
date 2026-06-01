import { useState, useEffect, useRef, useCallback } from 'react';

export const useZoomPan = (containerRef: React.RefObject<HTMLDivElement | null>) => {
  const [scale, setScale] = useState<number>(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Referencias de RAM instantánea para el trackpad
  const scaleRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const rAFRef = useRef<number | null>(null);
  const isZPressedRef = useRef(false);
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key.toLowerCase() === 'z') isZPressedRef.current = true; };
    const up = (e: KeyboardEvent) => { if (e.key.toLowerCase() === 'z') isZPressedRef.current = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  const handleZoomIn = useCallback(() => {
    setScale(prev => {
      const next = Math.min(prev * 1.35, 6.0);
      scaleRef.current = next;
      return next;
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(prev => {
      const next = Math.max(prev / 1.35, 0.4);
      scaleRef.current = next;
      return next;
    });
  }, []);

  const handleResetZoom = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    scaleRef.current = 1;
    panRef.current = { x: 0, y: 0 };
  }, []);

  // Motor definitivo a prueba de asfixia (requestAnimationFrame)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheelEvent = (e: WheelEvent) => {
      e.preventDefault();

      // 🚀 RESCATE SÍNCRONO: El navegador destruye 'e' después de este milisegundo. Guardamos todo en memoria.
      const clientX = e.clientX;
      const clientY = e.clientY;
      const deltaX = e.deltaX;
      const deltaY = e.deltaY;
      const isZ = isZPressedRef.current;

      if (rAFRef.current) cancelAnimationFrame(rAFRef.current);

      rAFRef.current = requestAnimationFrame(() => {
        const currentScale = scaleRef.current;
        const currentPan = panRef.current;

        const viewRect = container.getBoundingClientRect();
        const mouseX = clientX - viewRect.left;
        const mouseY = clientY - viewRect.top;

        if (isZ) {
          console.log(`[ZoomPan] 🔍 Z PRESIONADO | deltaY: ${deltaY} | scale previo: ${currentScale}`);
          // Zoom Dinámico con ALT
          const zoomFactor = deltaY < 0 ? 1.15 : 1 / 1.15;
          const nextScale = Math.min(Math.max(currentScale * zoomFactor, 0.4), 6.0);

          const nextPan = {
            x: mouseX - (mouseX - currentPan.x) * (nextScale / currentScale),
            y: mouseY - (mouseY - currentPan.y) * (nextScale / currentScale)
          };

          scaleRef.current = nextScale;
          panRef.current = nextPan;
          setScale(nextScale);
          setPan(nextPan);
        } else {
          // Desplazamiento nativo
          const nextPan = {
            x: currentPan.x - deltaX * 0.8,
            y: currentPan.y - deltaY * 0.8
          };
          panRef.current = nextPan;
          setPan(nextPan);
        }
      });
    };

    container.addEventListener('wheel', handleWheelEvent, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheelEvent);
      if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
    };
  }, [containerRef]);

  return { scale, pan, handleZoomIn, handleZoomOut, handleResetZoom };
};
