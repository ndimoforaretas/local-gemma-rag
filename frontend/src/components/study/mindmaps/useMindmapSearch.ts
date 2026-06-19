/**
 * Node search for the mindmap canvas: case-insensitive label matching,
 * next/prev cycling, and viewport centring on the active match.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import type { MindmapFlowNode } from "./treeToFlow";

export interface MindmapSearch {
  query: string;
  setQuery: (q: string) => void;
  /** Ids of all matching (visible) nodes. */
  matches: Set<string>;
  matchCount: number;
  /** 1-based position of the active match; 0 when there are none. */
  position: number;
  activeId: string | null;
  next: () => void;
  prev: () => void;
  clear: () => void;
}

export function useMindmapSearch(
  nodes: MindmapFlowNode[],
  hidden: Set<string>,
): MindmapSearch {
  const rf = useReactFlow();
  const [query, setRawQuery] = useState("");
  const [index, setIndex] = useState(0);

  // Changing the query restarts cycling from the first match.
  const setQuery = useCallback((q: string) => {
    setRawQuery(q);
    setIndex(0);
  }, []);

  const matchIds = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as string[];
    return nodes
      .filter((n) => !hidden.has(n.id) && n.data.label.toLowerCase().includes(q))
      .map((n) => n.id);
  }, [nodes, hidden, query]);

  const count = matchIds.length;
  const norm = count ? ((index % count) + count) % count : 0;
  const activeId = count ? matchIds[norm] : null;

  // Centre the viewport on the active match.
  useEffect(() => {
    if (!activeId) return;
    const node = rf.getNode(activeId);
    if (!node) return;
    const w = node.measured?.width ?? 190;
    const h = node.measured?.height ?? 44;
    rf.setCenter(node.position.x + w / 2, node.position.y + h / 2, {
      zoom: Math.max(rf.getZoom(), 0.85),
      duration: 350,
    });
  }, [activeId, rf]);

  const next = useCallback(() => setIndex((i) => i + 1), []);
  const prev = useCallback(() => setIndex((i) => i - 1), []);
  const clear = useCallback(() => {
    setRawQuery("");
    setIndex(0);
  }, []);

  const matches = useMemo(() => new Set(matchIds), [matchIds]);

  return {
    query,
    setQuery,
    matches,
    matchCount: count,
    position: count ? norm + 1 : 0,
    activeId,
    next,
    prev,
    clear,
  };
}
