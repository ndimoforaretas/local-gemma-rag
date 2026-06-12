/**
 * All canvas state for the mindmap renderer: layout + saved positions, branch
 * collapse, node search, lock/snap toggles, and position persistence. The
 * components stay thin; this hook is the single source of truth.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNodesState, useReactFlow } from "@xyflow/react";
import {
  buildChildrenMap,
  decorateEdges,
  decorateNodes,
  descendantCounts,
  hiddenByCollapse,
  layoutNodes,
  type NodePositions,
} from "./flowDecorations";
import { flowToGraph, graphToFlow, treeToFlow, type MindmapFlowNode } from "./treeToFlow";
import type { Mindmap, MindmapGraph, MindmapLayout } from "./types";
import { useIsDark } from "./useIsDark";
import { useMindmapSearch } from "./useMindmapSearch";

export function useMindmapCanvas(
  mindmap: Mindmap,
  layout: MindmapLayout,
  positions: NodePositions | null,
  onPositionsChange: (positions: NodePositions) => void,
  onGraphChange: (graph: MindmapGraph) => void,
) {
  const isDark = useIsDark();
  const rf = useReactFlow();

  // User-edited graph wins; otherwise render the AI-generated tree.
  const graph = useMemo(
    () => (mindmap.graph ? graphToFlow(mindmap.graph) : treeToFlow(mindmap.tree)),
    [mindmap.graph, mindmap.tree],
  );
  const children = useMemo(() => buildChildrenMap(graph.edges), [graph.edges]);
  const counts = useMemo(() => descendantCounts(children), [children]);

  const [nodes, setNodes, onNodesChange] = useNodesState<MindmapFlowNode>(
    layoutNodes(graph, layout, positions),
  );

  // Re-layout when the tree, direction, or saved positions change.
  useEffect(() => {
    setNodes(layoutNodes(graph, layout, positions));
  }, [graph, layout, positions, setNodes]);

  // No reset-on-id effect needed: MindmapView keys the canvas by mindmap id,
  // so switching maps remounts this hook with a fresh collapsed set.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleCollapse = useCallback((id: string) => {
    setCollapsed((prev) => {
      const nextSet = new Set(prev);
      if (nextSet.has(id)) nextSet.delete(id);
      else nextSet.add(id);
      return nextSet;
    });
  }, []);

  // Rename a node: serialise the current structure (forking from the AI tree
  // on first edit), apply the new label, persist. Ids stay stable throughout.
  const renameNode = useCallback(
    (id: string, label: string) => {
      const trimmed = label.trim();
      const current = graph.nodes.find((n) => n.id === id);
      if (!trimmed || !current || current.data.label === trimmed) return;
      const next = flowToGraph(graph);
      next.nodes.find((n) => n.id === id)!.label = trimmed;
      onGraphChange(next);
    },
    [graph, onGraphChange],
  );

  const hidden = useMemo(() => hiddenByCollapse(children, collapsed), [children, collapsed]);
  const search = useMindmapSearch(nodes, hidden);

  const [locked, setLocked] = useState(false);
  const [snap, setSnap] = useState(false);

  const displayNodes = useMemo(
    () =>
      decorateNodes(nodes, {
        hidden,
        collapsed,
        children,
        counts,
        matches: search.matches,
        activeMatchId: search.activeId,
        searching: search.query.trim().length > 0,
        onToggleCollapse: toggleCollapse,
        onRename: renameNode,
      }),
    [nodes, hidden, collapsed, children, counts, search.matches, search.activeId, search.query, toggleCollapse, renameNode],
  );

  const displayEdges = useMemo(
    () => decorateEdges(graph.edges, hidden, isDark),
    [graph.edges, hidden, isDark],
  );

  // Persist all node positions after any drag (single node or selection).
  const persist = useCallback(() => {
    const map: NodePositions = {};
    for (const n of rf.getNodes()) map[n.id] = { x: n.position.x, y: n.position.y };
    onPositionsChange(map);
  }, [rf, onPositionsChange]);

  // Fit the viewport to the current selection (or the whole map when none).
  const fitSelection = useCallback(() => {
    const selected = rf.getNodes().filter((n) => n.selected && !n.hidden);
    rf.fitView({ nodes: selected.length ? selected : undefined, padding: 0.2, duration: 350 });
  }, [rf]);

  return {
    isDark,
    displayNodes,
    displayEdges,
    onNodesChange,
    persist,
    search,
    locked,
    setLocked,
    snap,
    setSnap,
    fitSelection,
  };
}
