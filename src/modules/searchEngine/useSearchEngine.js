import { useState, useCallback, useMemo, useEffect, useRef } from "react";

export function useSearchEngine(nodes) {
  const [query, setQuery] = useState("");          // search bar value only
  const [focusedName, setFocusedName] = useState(null); // name group being navigated
  const [currentIndex, setCurrentIndex] = useState(0);
  const [navGeneration, setNavGeneration] = useState(0);
  const desiredIdRef = useRef(null);

  // Navigation matches: exact-name nodes for the focused group
  const navMatches = useMemo(() => {
    if (!focusedName) return [];
    return nodes.filter((n) => n.name === focusedName);
  }, [focusedName, nodes]);

  const matchIds = useMemo(() => new Set(navMatches.map((n) => n.id)), [navMatches]);

  // When focusedName changes, land on the desired node and trigger a jump
  useEffect(() => {
    if (!focusedName) return;
    if (desiredIdRef.current !== null) {
      const idx = navMatches.findIndex((m) => m.id === desiredIdRef.current);
      desiredIdRef.current = null;
      setCurrentIndex(idx >= 0 ? idx : 0);
    } else {
      setCurrentIndex(0);
    }
    setNavGeneration((g) => g + 1);
  }, [focusedName]); // eslint-disable-line react-hooks/exhaustive-deps

  const focusedMatch = navMatches.length > 0 ? navMatches[currentIndex] : null;

  // Click a node (map or panel) — never touches the search bar
  const focusNode = useCallback(
    (name, nodeId) => {
      if (name === focusedName) {
        const idx = navMatches.findIndex((m) => m.id === nodeId);
        if (idx >= 0) {
          setCurrentIndex(idx);
          setNavGeneration((g) => g + 1);
        }
      } else {
        desiredIdRef.current = nodeId;
        setFocusedName(name);
      }
    },
    [focusedName, navMatches]
  );

  const goNext = useCallback(() => {
    if (navMatches.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % navMatches.length);
    setNavGeneration((g) => g + 1);
  }, [navMatches.length]);

  const goPrev = useCallback(() => {
    if (navMatches.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + navMatches.length) % navMatches.length);
    setNavGeneration((g) => g + 1);
  }, [navMatches.length]);

  const clearNav = useCallback(() => {
    setFocusedName(null);
    setCurrentIndex(0);
  }, []);

  const clearSearch = useCallback(() => {
    setQuery("");
    setFocusedName(null);
    setCurrentIndex(0);
  }, []);

  return {
    query,
    setQuery,
    focusedName,
    focusNode,
    navMatches,
    matchIds,
    currentIndex,
    focusedMatch,
    matchCount: navMatches.length,
    hasResults: navMatches.length > 0,
    navGeneration,
    goNext,
    goPrev,
    clearNav,
    clearSearch,
  };
}
