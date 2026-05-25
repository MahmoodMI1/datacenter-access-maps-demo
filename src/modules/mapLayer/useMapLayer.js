import { useState, useCallback, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

// PDF render scale — higher = sharper but heavier.
// 2.0 is good for architectural plans (roughly 144 DPI).
const PDF_RENDER_SCALE = 2.0;

export function useMapLayer() {
  const [mapSrc, setMapSrc] = useState(null);       // data URL for images
  const [mapSize, setMapSize] = useState({ w: 0, h: 0 });
  const [mapType, setMapType] = useState(null);      // "image" | "pdf"
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [lastLoadedFile, setLastLoadedFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // For PDF, we render to a canvas and convert to data URL
  const pdfDocRef = useRef(null);

  // ---- PRIVATE: render a specific PDF page to a data URL ----
  const renderPdfPage = useCallback(async (pdfDoc, pageNum) => {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: PDF_RENDER_SCALE });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext("2d");
    await page.render({ canvasContext: ctx, viewport }).promise;

    const dataUrl = canvas.toDataURL("image/png");
    setMapSrc(dataUrl);
    setMapSize({ w: viewport.width, h: viewport.height });
    setCurrentPage(pageNum);
  }, []);

  // ---- LOAD FILE (image or PDF) ----
  const loadFile = useCallback(
    async (file) => {
      if (!file) return;

      setLoadError(null);
      setIsLoading(true);
      setLastLoadedFile(file);

      try {
        if (file.type === "application/pdf") {
          // ---- PDF path ----
          const arrayBuffer = await file.arrayBuffer();
          const pdfDoc = await pdfjsLib.getDocument({
            data: arrayBuffer,
          }).promise;

          pdfDocRef.current = pdfDoc;
          setMapType("pdf");
          setPageCount(pdfDoc.numPages);

          // Render first page
          await renderPdfPage(pdfDoc, 1);
        } else if (file.type.startsWith("image/")) {
          // ---- Image path ----
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error("Failed to read image"));
            reader.readAsDataURL(file);
          });

          const img = await new Promise((resolve, reject) => {
            const i = new Image();
            i.onload = () => resolve(i);
            i.onerror = () => reject(new Error("Failed to decode image"));
            i.src = dataUrl;
          });

          pdfDocRef.current = null;
          setMapType("image");
          setPageCount(0);
          setCurrentPage(1);
          setMapSrc(dataUrl);
          setMapSize({ w: img.naturalWidth, h: img.naturalHeight });
        } else {
          setLoadError("Unsupported file type. Use an image or PDF.");
        }
      } catch (err) {
        console.error("Map load error:", err);
        setLoadError(err.message || "Failed to load file");
      } finally {
        setIsLoading(false);
      }
    },
    [renderPdfPage]
  );

  // ---- PAGE NAVIGATION (PDF only) ----
  const goToPage = useCallback(
    async (pageNum) => {
      if (!pdfDocRef.current) return;
      const clamped = Math.max(1, Math.min(pageNum, pageCount));
      setIsLoading(true);
      try {
        await renderPdfPage(pdfDocRef.current, clamped);
      } catch (err) {
        setLoadError("Failed to render page " + clamped);
      } finally {
        setIsLoading(false);
      }
    },
    [pageCount, renderPdfPage]
  );

  // ---- DROP / DRAG / PICK handlers ----
  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) loadFile(file);
    },
    [loadFile]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleFilePick = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file) loadFile(file);
    },
    [loadFile]
  );

  // ---- LOAD FROM URL (restore from Supabase storage) ----
  const loadFromUrl = useCallback(
    async (url, fileType, width, height) => {
      setLoadError(null);
      setIsLoading(true);
      setLastLoadedFile(null);
      try {
        if (fileType === "pdf") {
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
          const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          pdfDocRef.current = pdfDoc;
          setMapType("pdf");
          setPageCount(pdfDoc.numPages);
          await renderPdfPage(pdfDoc, 1);
        } else {
          setMapType("image");
          setPageCount(0);
          setCurrentPage(1);
          setMapSrc(url);
          setMapSize({ w: width, h: height });
        }
      } catch (err) {
        setLoadError(err.message || "Failed to restore map");
      } finally {
        setIsLoading(false);
      }
    },
    [renderPdfPage]
  );

  // ---- CLEAR ----
  const clearMap = useCallback(() => {
    pdfDocRef.current = null;
    setMapSrc(null);
    setMapSize({ w: 0, h: 0 });
    setMapType(null);
    setPageCount(0);
    setCurrentPage(1);
    setLoadError(null);
    setLastLoadedFile(null);
  }, []);

  return {
    // State
    mapSrc,
    mapSize,
    mapType,
    isLoading,
    loadError,
    isDragOver,
    pageCount,
    currentPage,
    lastLoadedFile,

    // Actions
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleFilePick,
    handleFileLoad: loadFile,
    loadFromUrl,
    goToPage,
    clearMap,
  };
}
