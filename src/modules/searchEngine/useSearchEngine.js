import { useState, useCallback, useMemo, useEffect } from "react";

export function useSearchEngine(nodes) {
  const [query, setQuery] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return nodes.filter((n) => n.name.toLowerCase().includes(q));
  }, [query, nodes]);

  const matchIds = useMemo(() => new Set(matches.map((n) => n.id)), [matches]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [matches.length, query]);

  const focusedMatch = matches.length > 0 ? matches[currentIndex] : null;

  const goNext = useCallback(() => {
    if (matches.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % matches.length);
  }, [matches.length]);

  const goPrev = useCallback(() => {
    if (matches.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + matches.length) % matches.length);
  }, [matches.length]);

  const goToIndex = useCallback(
    (i) => {
      if (i >= 0 && i < matches.length) setCurrentIndex(i);
    },
    [matches.length]
  );

  const clearSearch = useCallback(() => {
    setQuery("");
    setCurrentIndex(0);
  }, []);

  return {
    query,
    matches,
    matchIds,
    currentIndex,
    focusedMatch,
    matchCount: matches.length,
    hasResults: matches.length > 0,
    setQuery,
    goNext,
    goPrev,
    goToIndex,
    clearSearch,
  };
}
