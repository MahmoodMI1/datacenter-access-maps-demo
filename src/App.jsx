import { useRef, useEffect, useState, useCallback } from "react";
import { useViewport, ZOOM_STEP, ZOOM_PLACEMENT_MIN } from "./modules/viewport";
import { useMapLayer } from "./modules/mapLayer";
import { useNodeLayer } from "./modules/nodeLayer";
import { useSearchEngine } from "./modules/searchEngine";
import { createMap, uploadMapFile, updateMap, deleteMap, fetchMaps, getMapFileUrl, fetchNodeCount } from "./modules/dataLayer";
import { useAuth } from "./modules/auth/useAuth";
import Login from "./components/Login";
import { styles } from "./styles";

const INSPECTION_ZOOM = 1.2;

export default function App() {
  const { session, authLoading, isAdmin, signIn, signOut } = useAuth();
  const viewport = useViewport();
  const map = useMapLayer();
  const [currentMapId, setCurrentMapId] = useState(null);
  const nodeLayer = useNodeLayer(currentMapId, map.mapSize);
  const searchEngine = useSearchEngine(nodeLayer.nodes);
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  const replaceFileInputRef = useRef(null);
  const [replaceMode, setReplaceMode] = useState(false);
  const [currentView, setCurrentView] = useState("dashboard");
  const [dashboardMaps, setDashboardMaps] = useState([]);
  const [nodeCounts, setNodeCounts] = useState({});
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardNewMap, setDashboardNewMap] = useState(false);
  const dashboardNewMapInputRef = useRef(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [nameInput, setNameInput] = useState("");
  const [nodeSize, setNodeSize] = useState(10);
  const nameInputRef = useRef(null);
  const searchInputRef = useRef(null);
  const panelRef = useRef(null);

  const handleCardClick = useCallback(async (mapRecord) => {
    try {
      const url = await getMapFileUrl(mapRecord.id);
      setCurrentMapId(mapRecord.id);
      setCurrentView("editor");
      map.loadFromUrl(url, mapRecord.file_type, mapRecord.width, mapRecord.height);
    } catch (err) {
      console.error("Failed to load map:", err);
    }
  }, [map]);

  const handleDeleteMap = useCallback(async (e, mapId) => {
    e.stopPropagation();
    if (!window.confirm("Delete this map and all its nodes?")) return;
    try {
      await deleteMap(mapId);
      setDashboardMaps((prev) => prev.filter((m) => m.id !== mapId));
      setNodeCounts((prev) => { const next = { ...prev }; delete next[mapId]; return next; });
    } catch (err) {
      console.error("Failed to delete map:", err);
    }
  }, []);

  const handleBackToDashboard = useCallback(() => {
    map.clearMap();
    setCurrentMapId(null);
    setCurrentView("dashboard");
  }, [map]);

  const handleFit = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    viewport.fitToScreen(width, height, map.mapSize.w, map.mapSize.h);
  }, [viewport.fitToScreen, map.mapSize.w, map.mapSize.h]);

  // Auto fit-to-screen whenever a new map finishes loading
  useEffect(() => {
    if (map.mapSize.w && map.mapSize.h) handleFit();
  }, [map.mapSize.w, map.mapSize.h]);

  // Restore the most recent map from Supabase on login
  useEffect(() => {
    if (!session || currentMapId || currentView === "dashboard") return;
    const restore = async () => {
      try {
        const maps = await fetchMaps();
        if (maps.length === 0) return;
        const latest = maps[0];
        if (!latest.file_url) return;
        const url = await getMapFileUrl(latest.id);
        if (!url) return;
        await map.loadFromUrl(url, latest.file_type, latest.width, latest.height);
        setCurrentMapId(latest.id);
      } catch (err) {
        console.error("Failed to restore map:", err);
      }
    };
    restore();
  }, [session]);

  // After map renders and we have dimensions, persist to Supabase
  useEffect(() => {
    if (!map.mapSrc || !map.mapSize.w || !map.lastLoadedFile) return;
    if (currentMapId) return;

    const persist = async () => {
      try {
        const fileType = map.mapType === "pdf" ? "pdf" : "image";
        const name = map.lastLoadedFile.name || "Untitled Map";
        const record = await createMap(name, fileType, map.mapSize.w, map.mapSize.h);
        setCurrentMapId(record.id);
        await uploadMapFile(map.lastLoadedFile, record.id);
      } catch (err) {
        console.error("Failed to persist map:", err);
      }
    };
    persist();
  }, [map.mapSrc, map.mapSize.w, map.mapType, map.lastLoadedFile, currentMapId]);

  // Reload dashboard map list whenever the dashboard becomes visible
  useEffect(() => {
    if (!session || currentView !== "dashboard") return;
    const load = async () => {
      setDashboardLoading(true);
      try {
        const maps = await fetchMaps();
        setDashboardMaps(maps);
        const counts = {};
        await Promise.all(maps.map(async (m) => {
          counts[m.id] = await fetchNodeCount(m.id);
        }));
        setNodeCounts(counts);
      } catch (err) {
        console.error("Failed to load dashboard:", err);
      } finally {
        setDashboardLoading(false);
      }
    };
    load();
  }, [session, currentView]);

  // After a REPLACE FILE pick renders, upload to the existing map record
  useEffect(() => {
    if (!replaceMode || !currentMapId) return;
    if (!map.mapSrc || !map.mapSize.w || !map.lastLoadedFile) return;
    setReplaceMode(false);
    const doReplace = async () => {
      try {
        const fileType = map.mapType === "pdf" ? "pdf" : "image";
        await uploadMapFile(map.lastLoadedFile, currentMapId);
        await updateMap(currentMapId, {
          width: map.mapSize.w,
          height: map.mapSize.h,
          file_type: fileType,
        });
      } catch (err) {
        console.error("Failed to replace map file:", err);
      }
    };
    doReplace();
  }, [replaceMode, map.mapSrc, map.mapSize.w, map.lastLoadedFile, currentMapId]);

  // Switch to editor once a new map created from the dashboard is persisted
  useEffect(() => {
    if (!dashboardNewMap || !currentMapId) return;
    setDashboardNewMap(false);
    setCurrentView("editor");
  }, [dashboardNewMap, currentMapId]);

  const jumpToNode = useCallback(
    (node) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.width / 2 - node.x * INSPECTION_ZOOM;
      const centerY = rect.height / 2 - node.y * INSPECTION_ZOOM;
      viewport.zoomTo(INSPECTION_ZOOM, centerX, centerY);
      nodeLayer.selectNode(node.id);
    },
    [viewport, nodeLayer]
  );

  useEffect(() => {
    if (searchEngine.navGeneration > 0 && searchEngine.focusedMatch) {
      jumpToNode(searchEngine.focusedMatch);
    }
  }, [searchEngine.navGeneration]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setPanelOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleCanvasClick = useCallback(
    (e) => {
      if (!nodeLayer.placementMode) return;
      if (!viewport.isPlacementReady) return;
      const rect = containerRef.current.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const mapX = (screenX - viewport.pan.x) / viewport.zoom;
      const mapY = (screenY - viewport.pan.y) / viewport.zoom;
      nodeLayer.placeAt(mapX, mapY);
      setNameInput("");
      setTimeout(() => nameInputRef.current?.focus(), 50);
    },
    [nodeLayer, viewport]
  );

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current?.contains(e.target)) return;
      e.preventDefault();
      viewport.handleWheel(e, containerRef.current);
    };
    window.addEventListener("wheel", handler, { capture: true, passive: false });
    return () => window.removeEventListener("wheel", handler, { capture: true });
  }, [viewport.handleWheel]);

  useEffect(() => {
    window.addEventListener("mouseup", viewport.handleMouseUp);
    return () => window.removeEventListener("mouseup", viewport.handleMouseUp);
  }, [viewport.handleMouseUp]);

  // Auth guards — after all hooks
  if (authLoading) return <div style={styles.authShell}><span style={styles.authLoadingText}>LOADING...</span></div>;
  if (!session) return <Login onSignIn={signIn} />;

  const panelNodes = (() => {
    const q = searchEngine.query.trim().toLowerCase();
    const source = q
      ? nodeLayer.nodes.filter((n) => n.name.toLowerCase().includes(q))
      : nodeLayer.nodes;
    const seen = new Map();
    for (const n of source) {
      if (!seen.has(n.name)) seen.set(n.name, { ...n, count: 1 });
      else seen.get(n.name).count++;
    }
    return [...seen.values()];
  })();

  const zoomPercent = Math.round(viewport.zoom * 100);
  const hasMap = !!map.mapSrc;

  // ---- DASHBOARD VIEW ----
  if (currentView === "dashboard") {
    return (
      <div style={styles.dashShell}>
        <div style={styles.dashHeader}>
          <span style={styles.dashTitle}>FLOOR PLANS</span>
          <div style={styles.dashHeaderRight}>
            <button onClick={() => dashboardNewMapInputRef.current?.click()} style={styles.dashCreateBtn}>
              + NEW MAP
            </button>
            <input
              ref={dashboardNewMapInputRef}
              type="file"
              accept="image/*,.pdf,application/pdf"
              onChange={(e) => { setDashboardNewMap(true); map.handleFilePick(e); }}
              style={{ display: "none" }}
            />
            <button onClick={signOut} style={styles.signOutBtn}>SIGN OUT</button>
          </div>
        </div>

        {dashboardLoading ? (
          <div style={styles.dashCentered}>
            <div style={styles.spinner} />
            <span style={styles.loadingText}>LOADING MAPS...</span>
          </div>
        ) : dashboardMaps.length === 0 ? (
          <div style={styles.dashCentered}>
            <span style={styles.dashEmpty}>No maps yet — create one to get started.</span>
          </div>
        ) : (
          <div style={styles.dashGrid}>
            {dashboardMaps.map((m) => (
              <div key={m.id} style={styles.dashCard} onClick={() => handleCardClick(m)}>
                <div style={styles.dashCardTop}>
                  <span style={styles.dashCardName}>{m.name}</span>
                  <span style={styles.fileTypeBadge}>{m.file_type.toUpperCase()}</span>
                </div>
                <div style={styles.dashCardMeta}>
                  <span>{m.width} × {m.height}px</span>
                  <span>{nodeCounts[m.id] ?? 0} nodes</span>
                  <span>{new Date(m.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteMap(e, m.id)}
                  style={styles.dashDeleteBtn}
                  title="Delete map"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={styles.shell}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>

      {/* ---- TOP BAR ---- */}
      <div style={styles.topBar}>
        <div style={styles.topBarLeft}>
          <button onClick={handleBackToDashboard} style={styles.backBtn}>
            ← MAPS
          </button>
          <div
            style={{
              ...styles.statusDot,
              background: viewport.isPlacementReady ? "#3ddc84" : "#ff6b35",
              boxShadow: viewport.isPlacementReady
                ? "0 0 6px #3ddc8466"
                : "0 0 6px #ff6b3566",
            }}
          />
          <span style={styles.title}>FLOOR PLAN</span>
          {map.mapType && (
            <span style={styles.fileTypeBadge}>
              {map.mapType.toUpperCase()}
            </span>
          )}
        </div>

        <div style={styles.topBarRight}>
          {/* Placement readiness */}
          <span
            style={{
              ...styles.placementLabel,
              color: viewport.isPlacementReady ? "#3ddc84" : "#ff6b35",
            }}
          >
            {viewport.isPlacementReady ? "PLACEMENT READY" : "ZOOM IN TO PLACE"}
          </span>

          {/* PDF page nav */}
          {map.mapType === "pdf" && map.pageCount > 1 && (
            <div style={styles.pageNav}>
              <button
                onClick={() => map.goToPage(map.currentPage - 1)}
                disabled={map.currentPage <= 1}
                style={{
                  ...styles.pageBtn,
                  opacity: map.currentPage <= 1 ? 0.3 : 1,
                }}
              >
                ◀
              </button>
              <span style={styles.pageLabel}>
                {map.currentPage} / {map.pageCount}
              </span>
              <button
                onClick={() => map.goToPage(map.currentPage + 1)}
                disabled={map.currentPage >= map.pageCount}
                style={{
                  ...styles.pageBtn,
                  opacity: map.currentPage >= map.pageCount ? 0.3 : 1,
                }}
              >
                ▶
              </button>
            </div>
          )}

          {/* Zoom controls */}
          <div style={styles.zoomControls}>
            <button
              onClick={() => viewport.zoomTo(viewport.zoom - ZOOM_STEP)}
              style={styles.zoomBtn}
            >
              −
            </button>
            <span style={styles.zoomLabel}>{zoomPercent}%</span>
            <button
              onClick={() => viewport.zoomTo(viewport.zoom + ZOOM_STEP)}
              style={styles.zoomBtn}
            >
              +
            </button>
          </div>

          {/* Reset */}
          <button onClick={handleFit} style={styles.resetBtn}>
            RESET
          </button>

          {/* Load file — admin only */}
          {isAdmin && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={styles.loadBtn}
              >
                NEW MAP
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,application/pdf"
                onChange={(e) => {
                  setCurrentMapId(null);
                  map.handleFilePick(e);
                }}
                style={{ display: "none" }}
              />
              {currentMapId && (
                <>
                  <button
                    onClick={() => replaceFileInputRef.current?.click()}
                    style={styles.replaceBtn}
                  >
                    REPLACE FILE
                  </button>
                  <input
                    ref={replaceFileInputRef}
                    type="file"
                    accept="image/*,.pdf,application/pdf"
                    onChange={(e) => {
                      setReplaceMode(true);
                      map.handleFilePick(e);
                    }}
                    style={{ display: "none" }}
                  />
                </>
              )}
            </>
          )}

          {/* Sign out */}
          <button onClick={signOut} style={styles.signOutBtn}>
            SIGN OUT
          </button>
        </div>
      </div>

      {/* ---- MAIN AREA (canvas + panel) ---- */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* ---- CANVAS ---- */}
        <div
          ref={containerRef}
          onMouseDown={viewport.handleMouseDown}
          onMouseMove={viewport.handleMouseMove}
          onClick={handleCanvasClick}
          onDrop={map.handleDrop}
          onDragOver={map.handleDragOver}
          onDragLeave={map.handleDragLeave}
          style={{
            ...styles.canvas,
            cursor: nodeLayer.placementMode
              ? viewport.isPlacementReady
                ? "crosshair"
                : "not-allowed"
              : "grab",
          }}
        >
        {/* Grid background */}
        <div
          style={{
            ...styles.grid,
            backgroundSize: `${24 * viewport.zoom}px ${24 * viewport.zoom}px`,
            backgroundPosition: `${viewport.pan.x}px ${viewport.pan.y}px`,
          }}
        />

        {/* Transform container — all map-space content goes here */}
        <div
          style={{
            transform: `translate(${viewport.pan.x}px, ${viewport.pan.y}px) scale(${viewport.zoom})`,
            transformOrigin: "0 0",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          {hasMap && (
            <img
              src={map.mapSrc}
              alt="Floor plan"
              draggable={false}
              style={{
                display: "block",
                maxWidth: "none",
                imageRendering: viewport.zoom > 2 ? "pixelated" : "auto",
              }}
            />
          )}

          {/* ---- NODE LAYER (Module 3) ---- */}
          {nodeLayer.nodes.map((node) => {
            const isSelected = node.id === nodeLayer.selectedId;
            const isMatch = searchEngine.matchIds.has(node.id);
            const isFocused =
              searchEngine.focusedMatch?.id === node.id;
            return (
              <div
                key={node.id}
                onClick={(e) => {
                  e.stopPropagation();
                  nodeLayer.selectNode(node.id);
                  searchEngine.focusNode(node.name, node.id);
                }}
                style={{
                  position: "absolute",
                  left: node.x,
                  top: node.y,
                  transform: "translate(-50%, -50%)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                  pointerEvents: "auto",
                  cursor: "pointer",
                }}
              >
                {/* Dot */}
                <div
                  style={{
                    width: nodeSize,
                    height: nodeSize,
                    borderRadius: "50%",
                    background: isFocused
                      ? "#ff5c35"
                      : isMatch
                      ? "#ffc233"
                      : isSelected
                      ? "#ff5c35"
                      : "#4a90a4",
                    border: `2px solid ${
                      isFocused
                        ? "#ff8a65"
                        : isMatch
                        ? "#ffe082"
                        : isSelected
                        ? "#ff8a65"
                        : "#2a3a42"
                    }`,
                    boxShadow: isFocused
                      ? "0 0 12px #ff5c35aa"
                      : isMatch
                      ? "0 0 8px #ffc23388"
                      : isSelected
                      ? "0 0 8px #ff5c3588"
                      : "0 0 4px rgba(0,0,0,0.4)",
                    transition: "all 0.15s ease",
                  }}
                />
                {/* Label */}
                <span
                  style={{
                    fontSize: Math.round(nodeSize * 0.8),
                    fontFamily:
                      "'IBM Plex Mono', 'JetBrains Mono', monospace",
                    color: isFocused
                      ? "#ff8a65"
                      : isMatch
                      ? "#ffc233"
                      : isSelected
                      ? "#ff8a65"
                      : "#a0b4be",
                    background: "rgba(10,15,20,0.8)",
                    padding: "1px 4px",
                    borderRadius: 2,
                    maxWidth: nodeSize * 8,
                    wordBreak: "break-word",
                    textAlign: "center",
                    letterSpacing: "0.03em",
                    fontWeight: isFocused || isMatch || isSelected ? 600 : 400,
                    lineHeight: 1.3,
                  }}
                >
                  {node.name}
                </span>
              </div>
            );
          })}

          {/* Pending node — awaiting name input */}
          {nodeLayer.pendingNode && (
            <div
              style={{
                position: "absolute",
                left: nodeLayer.pendingNode.x,
                top: nodeLayer.pendingNode.y,
                transform: "translate(-50%, -50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <div
                style={{
                  width: nodeSize,
                  height: nodeSize,
                  borderRadius: "50%",
                  background: "#3ddc84",
                  border: "2px solid #6aefaa",
                  boxShadow: "0 0 10px #3ddc8466",
                  animation: "pulse 1s ease infinite",
                }}
              />
              <input
                ref={nameInputRef}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && nameInput.trim()) {
                    nodeLayer.confirmNode(nameInput);
                    setNameInput("");
                  }
                  if (e.key === "Escape") {
                    nodeLayer.cancelPlacement();
                    setNameInput("");
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                placeholder="Room name..."
                style={{
                  background: "#0d1319",
                  border: "1px solid #3ddc84",
                  borderRadius: 4,
                  color: "#e0e8ec",
                  padding: "3px 8px",
                  fontSize: 9,
                  fontFamily:
                    "'IBM Plex Mono', 'JetBrains Mono', monospace",
                  outline: "none",
                  width: 120,
                  textAlign: "center",
                }}
              />
            </div>
          )}

          {/* MODULE 5 (Search UI highlights) will render here */}
        </div>

        {/* Loading overlay */}
        {map.isLoading && (
          <div style={styles.loadingOverlay}>
            <div style={styles.spinner} />
            <span style={styles.loadingText}>RENDERING...</span>
          </div>
        )}

        {/* Error overlay */}
        {map.loadError && (
          <div style={styles.errorOverlay}>
            <span style={styles.errorText}>{map.loadError}</span>
            <button onClick={map.clearMap} style={styles.errorDismiss}>
              DISMISS
            </button>
          </div>
        )}

        {/* Empty state */}
        {!hasMap && !map.isDragOver && !map.isLoading && (
          <div style={styles.emptyState}>
            <div style={styles.dropIcon}>↓</div>
            <span style={styles.emptyText}>
              Drop a floor plan or click LOAD MAP
            </span>
            <span style={styles.emptySubtext}>
              PDF, PNG, JPG, SVG — full resolution preserved
            </span>
          </div>
        )}

        {/* Drag-over feedback */}
        {map.isDragOver && (
          <div style={styles.dragOverlay}>DROP TO LOAD</div>
        )}
      </div>

        {/* Panel toggle tab */}
        <button
          onClick={() => setPanelOpen((p) => !p)}
          style={styles.panelToggle}
        >
          {panelOpen ? "▶" : "◀"}
        </button>

        {/* ---- SIDE PANEL ---- */}
        {panelOpen && (
          <div ref={panelRef} style={styles.panel}>
            {/* Panel header */}
            <div style={styles.panelHeader}>
              <span style={styles.panelTitle}>NODES</span>
              <span style={styles.panelCount}>{nodeLayer.nodes.length}</span>
            </div>

            {/* Search */}
            <div style={styles.panelSearch}>
              <input
                ref={searchInputRef}
                value={searchEngine.query}
                onChange={(e) => searchEngine.setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.shiftKey ? searchEngine.goPrev() : searchEngine.goNext();
                  }
                  if (e.key === "Escape") {
                    searchEngine.clearSearch();
                  }
                }}
                placeholder="Search nodes..."
                style={styles.searchInput}
              />
              {(searchEngine.query || searchEngine.focusedName) && (
                <button
                  onClick={() => searchEngine.clearSearch()}
                  style={styles.searchClear}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Search navigation — ◀ ▶ with counter */}
            {searchEngine.focusedName && (
              <div style={styles.searchNav}>
                <button
                  onClick={searchEngine.goPrev}
                  disabled={!searchEngine.hasResults}
                  style={{
                    ...styles.navArrow,
                    opacity: searchEngine.hasResults ? 1 : 0.3,
                  }}
                >
                  ◀
                </button>
                <span style={styles.navCounter}>
                  {searchEngine.hasResults
                    ? `${searchEngine.currentIndex + 1} of ${searchEngine.matchCount}`
                    : "0 results"}
                </span>
                <button
                  onClick={searchEngine.goNext}
                  disabled={!searchEngine.hasResults}
                  style={{
                    ...styles.navArrow,
                    opacity: searchEngine.hasResults ? 1 : 0.3,
                  }}
                >
                  ▶
                </button>
              </div>
            )}

            {/* Node size control */}
            <div style={styles.sizeControl}>
              <span style={styles.sizeLabel}>NODE SIZE</span>
              <div style={styles.sizeButtons}>
                <button onClick={() => setNodeSize((s) => Math.max(4, s - 2))} style={styles.sizeBtn}>−</button>
                <span style={styles.sizeValue}>{nodeSize}px</span>
                <button onClick={() => setNodeSize((s) => Math.min(40, s + 2))} style={styles.sizeBtn}>+</button>
              </div>
            </div>

            {/* Add button — admin only */}
            {isAdmin && (
              <>
                <button
                  onClick={() => {
                    if (nodeLayer.placementMode) {
                      nodeLayer.cancelPlacement();
                    } else {
                      nodeLayer.startPlacement();
                    }
                  }}
                  style={{
                    ...styles.addBtn,
                    background: nodeLayer.placementMode ? "#2a1518" : "#1a2a38",
                    borderColor: nodeLayer.placementMode ? "#5a2a2a" : "#2a4055",
                    color: nodeLayer.placementMode ? "#e05555" : "#c8d6e0",
                  }}
                >
                  {nodeLayer.placementMode ? "CANCEL PLACEMENT" : "+ ADD NODE"}
                </button>
                {nodeLayer.placementMode && (
                  <div style={styles.placementHint}>
                    {viewport.isPlacementReady
                      ? "Click on the map to place"
                      : `Zoom in past ${Math.round(ZOOM_PLACEMENT_MIN * 100)}% to place`}
                  </div>
                )}
              </>
            )}

            {/* Node list */}
            <div style={styles.nodeList}>
              {panelNodes.length === 0 && (
                <div style={styles.emptyList}>
                  {searchEngine.query.trim()
                    ? "No matches"
                    : "No nodes yet — add one"}
                </div>
              )}
              {panelNodes.map((node) => {
                const isSelected = nodeLayer.nodes.some(n => n.name === node.name && n.id === nodeLayer.selectedId);
                const isEditing = node.id === nodeLayer.editingId;
                const isFocusedMatch = searchEngine.focusedMatch?.name === node.name;
                const isDuplicated = node.count > 1;
                return (
                  <div
                    key={node.id}
                    style={{
                      ...styles.nodeRow,
                      background: isFocusedMatch
                        ? "rgba(255,92,53,0.15)"
                        : isSelected
                        ? "rgba(255,92,53,0.1)"
                        : "transparent",
                      borderColor: isFocusedMatch
                        ? "rgba(255,92,53,0.4)"
                        : isSelected
                        ? "rgba(255,92,53,0.3)"
                        : "#1a2530",
                    }}
                  >
                    {isEditing ? (
                      <input
                        autoFocus
                        defaultValue={node.name}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            nodeLayer.saveEdit(node.id, e.target.value);
                          }
                          if (e.key === "Escape") {
                            nodeLayer.cancelEdit();
                          }
                        }}
                        onBlur={(e) =>
                          nodeLayer.saveEdit(node.id, e.target.value)
                        }
                        onClick={(e) => e.stopPropagation()}
                        style={styles.editInput}
                      />
                    ) : (
                      <span
                        onClick={() => {
                          searchEngine.focusNode(node.name, node.id);
                        }}
                        style={styles.nodeName}
                        title={isDuplicated ? `${node.count} locations — use ◀▶ to cycle` : "Click to zoom to node"}
                      >
                        {node.name}
                      </span>
                    )}
                    <div style={styles.nodeActions}>
                      {isDuplicated && (
                        <span style={{
                          fontSize: 9,
                          color: "#4a90a4",
                          background: "rgba(74,144,164,0.12)",
                          border: "1px solid rgba(74,144,164,0.2)",
                          borderRadius: 3,
                          padding: "1px 5px",
                          letterSpacing: "0.04em",
                          flexShrink: 0,
                        }}>
                          ×{node.count}
                        </span>
                      )}
                      {isAdmin && (
                        <>
                          {!isEditing && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                nodeLayer.startEditing(node.id);
                              }}
                              style={styles.actionBtn}
                              title="Rename"
                            >
                              ✎
                            </button>
                          )}
                          {(() => {
                            const deleteId = isDuplicated
                              ? (searchEngine.focusedMatch?.name === node.name ? searchEngine.focusedMatch.id : null)
                              : node.id;
                            return (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (deleteId) nodeLayer.deleteNode(deleteId);
                                }}
                                disabled={!deleteId}
                                style={{
                                  ...styles.actionBtn,
                                  color: deleteId ? "#e05555" : "#3a5568",
                                  cursor: deleteId ? "pointer" : "not-allowed",
                                }}
                                title={isDuplicated && !deleteId ? "Use ◀▶ to navigate to a specific instance first" : "Delete"}
                              >
                                ✕
                              </button>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* ---- STATUS BAR ---- */}
      <div style={styles.statusBar}>
        <span>
          {hasMap
            ? `${map.mapSize.w} × ${map.mapSize.h}px`
            : "No map loaded"}
          {map.mapType === "pdf" && ` · Page ${map.currentPage}`}
        </span>
        <span>
          PAN ({Math.round(viewport.pan.x)}, {Math.round(viewport.pan.y)}) ·
          ZOOM {zoomPercent}%
        </span>
      </div>
    </div>
  );
}

const _unused = {
  shell: {
    width: "100%",
    height: "100vh",
    background: "#0a0f14",
    display: "flex",
    flexDirection: "column",
    fontFamily: "'IBM Plex Mono', 'JetBrains Mono', 'Fira Code', monospace",
    color: "#8a9baa",
    overflow: "hidden",
    userSelect: "none",
  },
  topBar: {
    height: 48,
    minHeight: 48,
    background: "#0d1319",
    borderBottom: "1px solid #1a2530",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 16px",
    gap: 12,
  },
  topBarLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  topBarRight: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    transition: "all 0.3s ease",
  },
  title: {
    fontSize: 13,
    letterSpacing: "0.06em",
    color: "#c8d6e0",
  },
  fileTypeBadge: {
    fontSize: 9,
    letterSpacing: "0.08em",
    color: "#4a90a4",
    background: "rgba(74,144,164,0.12)",
    padding: "2px 6px",
    borderRadius: 3,
    border: "1px solid rgba(74,144,164,0.2)",
  },
  placementLabel: {
    fontSize: 10,
    letterSpacing: "0.08em",
    transition: "color 0.3s ease",
  },
  pageNav: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#111922",
    borderRadius: 6,
    padding: "4px 8px",
    border: "1px solid #1a2530",
  },
  pageBtn: {
    background: "none",
    border: "none",
    color: "#8a9baa",
    fontSize: 10,
    cursor: "pointer",
    padding: "0 2px",
  },
  pageLabel: {
    fontSize: 10,
    color: "#c8d6e0",
    minWidth: 36,
    textAlign: "center",
  },
  zoomControls: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#111922",
    borderRadius: 6,
    padding: "4px 8px",
    border: "1px solid #1a2530",
  },
  zoomBtn: {
    background: "none",
    border: "none",
    color: "#8a9baa",
    fontSize: 16,
    cursor: "pointer",
    padding: "0 4px",
    lineHeight: 1,
  },
  zoomLabel: {
    fontSize: 11,
    color: "#c8d6e0",
    minWidth: 40,
    textAlign: "center",
  },
  resetBtn: {
    background: "#111922",
    border: "1px solid #1a2530",
    color: "#8a9baa",
    fontSize: 10,
    letterSpacing: "0.06em",
    cursor: "pointer",
    padding: "5px 10px",
    borderRadius: 5,
  },
  loadBtn: {
    background: "#1a2a38",
    border: "1px solid #2a4055",
    color: "#c8d6e0",
    fontSize: 10,
    letterSpacing: "0.06em",
    cursor: "pointer",
    padding: "5px 10px",
    borderRadius: 5,
  },
  backBtn: {
    background: "none",
    border: "1px solid #1a2530",
    color: "#4a6070",
    fontSize: 10,
    letterSpacing: "0.06em",
    cursor: "pointer",
    padding: "5px 10px",
    borderRadius: 5,
  },
  replaceBtn: {
    background: "#1a2030",
    border: "1px solid #3a4060",
    color: "#a0b0d0",
    fontSize: 10,
    letterSpacing: "0.06em",
    cursor: "pointer",
    padding: "5px 10px",
    borderRadius: 5,
  },
  signOutBtn: {
    background: "#111922",
    border: "1px solid #1a2530",
    color: "#4a6070",
    fontSize: 10,
    letterSpacing: "0.06em",
    cursor: "pointer",
    padding: "5px 10px",
    borderRadius: 5,
  },
  canvas: {
    flex: 1,
    overflow: "hidden",
    cursor: "grab",
    position: "relative",
    background: "#0a0f14",
  },
  grid: {
    position: "absolute",
    inset: 0,
    backgroundImage: `
      linear-gradient(rgba(30,50,65,0.3) 1px, transparent 1px),
      linear-gradient(90deg, rgba(30,50,65,0.3) 1px, transparent 1px)
    `,
    pointerEvents: "none",
  },
  loadingOverlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(10,15,20,0.85)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    zIndex: 200,
  },
  spinner: {
    width: 28,
    height: 28,
    border: "2px solid #1a2530",
    borderTop: "2px solid #4a90a4",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: {
    fontSize: 11,
    letterSpacing: "0.1em",
    color: "#4a90a4",
  },
  errorOverlay: {
    position: "absolute",
    bottom: 48,
    left: "50%",
    transform: "translateX(-50%)",
    background: "#2a1518",
    border: "1px solid #5a2a2a",
    borderRadius: 6,
    padding: "10px 16px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    zIndex: 200,
  },
  errorText: {
    fontSize: 11,
    color: "#e05555",
  },
  errorDismiss: {
    background: "none",
    border: "1px solid #5a2a2a",
    color: "#e05555",
    fontSize: 9,
    cursor: "pointer",
    padding: "3px 8px",
    borderRadius: 4,
    letterSpacing: "0.06em",
  },
  emptyState: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    pointerEvents: "none",
  },
  dropIcon: {
    width: 64,
    height: 64,
    border: "2px dashed #1e3241",
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 24,
    color: "#2a4055",
  },
  emptyText: {
    fontSize: 12,
    color: "#3a5568",
    letterSpacing: "0.05em",
  },
  emptySubtext: {
    fontSize: 10,
    color: "#2a3d4d",
  },
  dragOverlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(74,144,164,0.08)",
    border: "2px dashed #4a90a4",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    color: "#4a90a4",
    letterSpacing: "0.06em",
  },
  statusBar: {
    height: 28,
    minHeight: 28,
    background: "#0d1319",
    borderTop: "1px solid #1a2530",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 16px",
    fontSize: 10,
    color: "#4a6070",
    letterSpacing: "0.04em",
  },
  // ---- PANEL STYLES ----
  panel: {
    width: 260,
    minWidth: 260,
    background: "#0d1319",
    borderLeft: "1px solid #1a2530",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  panelHeader: {
    padding: "12px 14px 8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1px solid #1a2530",
  },
  panelTitle: {
    fontSize: 11,
    letterSpacing: "0.08em",
    color: "#c8d6e0",
  },
  panelCount: {
    fontSize: 10,
    color: "#4a6070",
    background: "#111922",
    padding: "2px 7px",
    borderRadius: 10,
  },
  panelSearch: {
    padding: "10px 14px 6px",
    position: "relative",
  },
  searchInput: {
    width: "100%",
    background: "#111922",
    border: "1px solid #1a2530",
    borderRadius: 5,
    color: "#c8d6e0",
    padding: "6px 28px 6px 10px",
    fontSize: 11,
    fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
    outline: "none",
    letterSpacing: "0.03em",
  },
  searchClear: {
    position: "absolute",
    right: 20,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    color: "#4a6070",
    fontSize: 11,
    cursor: "pointer",
    padding: "2px 4px",
  },
  searchNav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: "4px 14px 8px",
  },
  navArrow: {
    background: "#111922",
    border: "1px solid #1a2530",
    color: "#c8d6e0",
    fontSize: 11,
    cursor: "pointer",
    padding: "4px 10px",
    borderRadius: 4,
    fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
  },
  navCounter: {
    fontSize: 11,
    color: "#c8d6e0",
    letterSpacing: "0.04em",
    minWidth: 60,
    textAlign: "center",
  },
  addBtn: {
    margin: "6px 14px",
    padding: "7px 0",
    border: "1px solid #2a4055",
    borderRadius: 5,
    fontSize: 10,
    letterSpacing: "0.06em",
    cursor: "pointer",
    fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
    transition: "all 0.15s ease",
  },
  placementHint: {
    padding: "0 14px 8px",
    fontSize: 9,
    color: "#4a6070",
    letterSpacing: "0.04em",
    textAlign: "center",
  },
  nodeList: {
    flex: 1,
    overflowY: "auto",
    padding: "4px 8px",
  },
  emptyList: {
    padding: "24px 14px",
    textAlign: "center",
    fontSize: 10,
    color: "#3a5568",
    letterSpacing: "0.04em",
  },
  nodeRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "6px 8px",
    borderRadius: 4,
    border: "1px solid #1a2530",
    marginBottom: 2,
    transition: "background 0.1s ease",
  },
  nodeName: {
    fontSize: 11,
    color: "#a0b4be",
    cursor: "pointer",
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    paddingRight: 8,
  },
  nodeActions: {
    display: "flex",
    gap: 4,
    flexShrink: 0,
  },
  actionBtn: {
    background: "none",
    border: "none",
    color: "#4a6070",
    fontSize: 12,
    cursor: "pointer",
    padding: "2px 4px",
    borderRadius: 3,
    lineHeight: 1,
  },
  editInput: {
    flex: 1,
    background: "#111922",
    border: "1px solid #4a90a4",
    borderRadius: 4,
    color: "#e0e8ec",
    padding: "3px 8px",
    fontSize: 11,
    fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
    outline: "none",
    marginRight: 8,
  },
  sizeControl: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "6px 14px",
    borderBottom: "1px solid #1a2530",
  },
  sizeLabel: { fontSize: 9, letterSpacing: "0.08em", color: "#4a6070" },
  sizeButtons: { display: "flex", alignItems: "center", gap: 6 },
  sizeBtn: {
    background: "#111922",
    border: "1px solid #1a2530",
    color: "#8a9baa",
    fontSize: 14,
    cursor: "pointer",
    width: 22,
    height: 22,
    borderRadius: 4,
    lineHeight: 1,
  },
  sizeValue: { fontSize: 11, color: "#c8d6e0", minWidth: 32, textAlign: "center" },
  panelToggle: {
    width: 20,
    background: "#0d1319",
    border: "none",
    borderLeft: "1px solid #1a2530",
    color: "#4a6070",
    fontSize: 10,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
};

const dashStyles = {
  shell: {
    width: "100%",
    height: "100vh",
    background: "#0a0f14",
    display: "flex",
    flexDirection: "column",
    fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
    color: "#8a9baa",
    overflow: "hidden",
  },
  header: {
    height: 56,
    minHeight: 56,
    background: "#0d1319",
    borderBottom: "1px solid #1a2530",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
  },
  title: {
    fontSize: 13,
    letterSpacing: "0.08em",
    color: "#c8d6e0",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  createBtn: {
    background: "#1a2a38",
    border: "1px solid #2a4055",
    color: "#c8d6e0",
    fontSize: 10,
    letterSpacing: "0.06em",
    cursor: "pointer",
    padding: "6px 14px",
    borderRadius: 5,
  },
  grid: {
    flex: 1,
    overflowY: "auto",
    padding: 24,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 16,
    alignContent: "start",
  },
  card: {
    background: "#0d1319",
    border: "1px solid #1a2530",
    borderRadius: 8,
    padding: "14px 16px",
    cursor: "pointer",
    position: "relative",
    transition: "border-color 0.15s ease",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  cardTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  cardName: {
    fontSize: 12,
    color: "#c8d6e0",
    letterSpacing: "0.04em",
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  cardMeta: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    fontSize: 10,
    color: "#4a6070",
    letterSpacing: "0.03em",
  },
  deleteBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    background: "none",
    border: "none",
    color: "#3a5568",
    fontSize: 11,
    cursor: "pointer",
    padding: "2px 5px",
    borderRadius: 3,
    lineHeight: 1,
  },
  centered: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  empty: {
    fontSize: 12,
    color: "#3a5568",
    letterSpacing: "0.04em",
  },
};

const loadingShell = {
  width: "100%",
  height: "100vh",
  background: "#0a0f14",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const loadingText = {
  fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
  fontSize: 11,
  letterSpacing: "0.1em",
  color: "#4a6070",
};
