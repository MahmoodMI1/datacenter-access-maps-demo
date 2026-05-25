import { useState, useCallback, useEffect } from "react";
import {
  fetchNodes,
  createNode as apiCreateNode,
  updateNode as apiUpdateNode,
  deleteNode as apiDeleteNode,
  deleteAllNodes as apiDeleteAllNodes,
} from "../dataLayer";

// Convert between pixel coords and percentage coords.
// Stored as percentages so they survive resolution changes.
function toPct(px, total) {
  return total > 0 ? (px / total) * 100 : 0;
}
function toPx(pct, total) {
  return (pct / 100) * total;
}

export function useNodeLayer(mapId, mapSize) {
  const [nodes, setNodes] = useState([]);
  const [placementMode, setPlacementMode] = useState(false);
  const [pendingNode, setPendingNode] = useState(null); // { x, y } awaiting name
  const [editingId, setEditingId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // ---- LOAD nodes when mapId changes ----
  useEffect(() => {
    if (!mapId || !mapSize?.w || !mapSize?.h) {
      setNodes([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetchNodes(mapId)
      .then((rows) => {
        if (cancelled) return;
        // Convert percentage coords back to pixel coords
        const pixelNodes = rows.map((r) => ({
          id: r.id,
          name: r.name,
          x: toPx(r.x_pct, mapSize.w),
          y: toPx(r.y_pct, mapSize.h),
        }));
        setNodes(pixelNodes);
      })
      .catch((err) => {
        if (!cancelled) console.error("Failed to load nodes:", err);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mapId, mapSize?.w, mapSize?.h]);

  // ---- ADD flow: enter placement mode → click canvas → name it ----

  const startPlacement = useCallback(() => {
    setPlacementMode(true);
    setPendingNode(null);
    setEditingId(null);
  }, []);

  const cancelPlacement = useCallback(() => {
    setPlacementMode(false);
    setPendingNode(null);
  }, []);

  // Called when user clicks on canvas during placement mode.
  // x, y are in map-space pixel coordinates.
  const placeAt = useCallback((x, y) => {
    setPendingNode({ x, y });
  }, []);

  // Called when user confirms the name for a pending node.
  const confirmNode = useCallback(
    async (name) => {
      if (!pendingNode || !name.trim() || !mapId) return;

      const trimmed = name.trim();
      const xPct = toPct(pendingNode.x, mapSize?.w || 1);
      const yPct = toPct(pendingNode.y, mapSize?.h || 1);

      // Optimistic: add immediately with a temp id
      const tempId = Date.now();
      const tempNode = {
        id: tempId,
        name: trimmed,
        x: pendingNode.x,
        y: pendingNode.y,
      };
      setNodes((prev) => [...prev, tempNode]);
      setPendingNode(null);
      setPlacementMode(false);

      try {
        const saved = await apiCreateNode(mapId, trimmed, xPct, yPct);
        // Replace temp node with real one (gets the real DB id)
        setNodes((prev) =>
          prev.map((n) =>
            n.id === tempId
              ? { id: saved.id, name: saved.name, x: tempNode.x, y: tempNode.y }
              : n
          )
        );
      } catch (err) {
        console.error("Failed to save node:", err);
        // Rollback
        setNodes((prev) => prev.filter((n) => n.id !== tempId));
      }
    },
    [pendingNode, mapId, mapSize]
  );

  // ---- EDIT ----

  const startEditing = useCallback((id) => {
    setEditingId(id);
  }, []);

  const saveEdit = useCallback(
    async (id, newName) => {
      if (!newName.trim()) return;
      const trimmed = newName.trim();

      // Optimistic update
      let oldName = "";
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id === id) {
            oldName = n.name;
            return { ...n, name: trimmed };
          }
          return n;
        })
      );
      setEditingId(null);

      try {
        await apiUpdateNode(id, { name: trimmed });
      } catch (err) {
        console.error("Failed to update node:", err);
        // Rollback
        setNodes((prev) =>
          prev.map((n) => (n.id === id ? { ...n, name: oldName } : n))
        );
      }
    },
    []
  );

  const cancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  // ---- DELETE ----

  const deleteNode = useCallback(
    async (id) => {
      // Optimistic delete
      let removed = null;
      setNodes((prev) => {
        removed = prev.find((n) => n.id === id);
        return prev.filter((n) => n.id !== id);
      });
      if (selectedId === id) setSelectedId(null);
      if (editingId === id) setEditingId(null);

      try {
        await apiDeleteNode(id);
      } catch (err) {
        console.error("Failed to delete node:", err);
        // Rollback
        if (removed) {
          setNodes((prev) => [...prev, removed]);
        }
      }
    },
    [selectedId, editingId]
  );

  // ---- SELECT ----

  const selectNode = useCallback((id) => {
    setSelectedId(id);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedId(null);
  }, []);

  // ---- BULK ----

  const clearAllNodes = useCallback(async () => {
    const backup = [...nodes];
    setNodes([]);
    setSelectedId(null);
    setEditingId(null);
    setPendingNode(null);
    setPlacementMode(false);

    if (mapId) {
      try {
        await apiDeleteAllNodes(mapId);
      } catch (err) {
        console.error("Failed to clear all nodes:", err);
        setNodes(backup);
      }
    }
  }, [nodes, mapId]);

  return {
    // State
    nodes,
    placementMode,
    pendingNode,
    editingId,
    selectedId,
    isLoading,

    // Placement
    startPlacement,
    cancelPlacement,
    placeAt,
    confirmNode,

    // Edit
    startEditing,
    saveEdit,
    cancelEdit,

    // Delete
    deleteNode,

    // Select
    selectNode,
    clearSelection,

    // Bulk
    clearAllNodes,
  };
}
