import { useState, useRef, useCallback, useEffect } from "react";

// ----- CONSTANTS -----
export const ZOOM_MIN = 0.05;
export const ZOOM_MAX = 5.0;
export const ZOOM_STEP = 0.03;
export const ZOOM_PLACEMENT_MIN = 0.8;

// ----- HOOK -----
export function useViewport() {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });

  // Live refs so handleWheel always sees current values without re-creating
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  const zoomMinRef = useRef(ZOOM_MIN); // updated by fitToScreen to lock out-zoom
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panRef.current = pan; }, [pan]);

  // handleWheel accepts the canvas element explicitly so it can be called
  // from a window-level listener (which has no useful currentTarget for rects)
  const handleWheel = useCallback((e, canvasEl) => {
    e.preventDefault();
    const currentZoom = zoomRef.current;
    const currentPan = panRef.current;
    const rect = (canvasEl || e.currentTarget).getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const mapX = (mouseX - currentPan.x) / currentZoom;
    const mapY = (mouseY - currentPan.y) / currentZoom;
    // Normalize across deltaMode so trackpad and mouse wheel feel consistent.
    const px = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaMode === 2 ? e.deltaY * 600 : e.deltaY;
    const newZoom = Math.max(zoomMinRef.current, Math.min(ZOOM_MAX, currentZoom * Math.exp(-px * 0.006)));
    setZoom(newZoom);
    setPan({ x: mouseX - mapX * newZoom, y: mouseY - mapY * newZoom });
  }, []);

  const handleMouseDown = useCallback(
    (e) => {
      if (e.button !== 0) return;
      isDragging.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY };
      panStart.current = { x: pan.x, y: pan.y };
    },
    [pan]
  );

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPan({
      x: panStart.current.x + dx,
      y: panStart.current.y + dy,
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const panTo = useCallback((x, y) => {
    setPan({ x, y });
  }, []);

  const zoomTo = useCallback((level, centerX, centerY) => {
    const clamped = Math.max(zoomMinRef.current, Math.min(ZOOM_MAX, level));
    setZoom(clamped);
    if (centerX !== undefined && centerY !== undefined) {
      setPan({ x: centerX, y: centerY });
    }
  }, []);

  const fitToScreen = useCallback((containerW, containerH, mapW, mapH) => {
    if (!mapW || !mapH) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }
    const fitZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.min(containerW / mapW, containerH / mapH)));
    zoomMinRef.current = fitZoom; // don't allow zooming out past fit
    setPan({
      x: (containerW - mapW * fitZoom) / 2,
      y: (containerH - mapH * fitZoom) / 2,
    });
    setZoom(fitZoom);
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const isPlacementReady = zoom >= ZOOM_PLACEMENT_MIN;

  return {
    zoom,
    pan,
    isPlacementReady,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    panTo,
    zoomTo,
    fitToScreen,
    resetView,
  };
}
