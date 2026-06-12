/**
 * All canvas state for the mindmap renderer: layout + saved positions, branch
 * collapse, node search, lock/snap toggles, and position persistence. The
 * components stay thin; this hook is the single source of truth.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNodesState, useReactFlow } from "@xyflow/react";
import { useTranslation } from "react-i18next";
import { addChildNode, deleteBranch, findRootId } from "./graphEdits";
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
  const { t } = useTranslation("study");

  // User-edited graph wins; otherwise render the AI-generated tree.
  const graph = useMemo(
    () => (mindmap.graph ? graphToFlow(mindmap.graph) : treeToFlow(mindmap.tree)),
    [mindmap.graph, mindmap.tree],
  );
  const rootId = useMemo(() => findRootId(graph), [graph]);
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

  // Newly added node whose rename editor should open on mount.
  const [pendingEditId, setPendingEditId] = useState<string | null>(null);
  const clearPendingEdit = useCallback(() => setPendingEditId(null), []);

  // Add a child under `parentId`, expand a collapsed parent so the new node
  // is visible, and queue its inline rename editor.
  const addChild = useCallback(
    (parentId: string) => {
      const result = addChildNode(
        graph,
        parentId,
        t("mindmap.canvas.newNode"),
        Object.keys(positions ?? {}),
      );
      if (!result) return;
      setCollapsed((prev) => {
        if (!prev.has(parentId)) return prev;
        const nextSet = new Set(prev);
        nextSet.delete(parentId);
        return nextSet;
      });
      setPendingEditId(result.newId);
      onGraphChange(result.next);
    },
    [graph, positions, onGraphChange, t],
  );

  // Branch deletes are confirmed first; leaves delete immediately.
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string;
    label: string;
    count: number;
  } | null>(null);

  const performDelete = useCallback(
    (id: string) => {
      const next = deleteBranch(graph, id);
      if (next) onGraphChange(next);
    },
    [graph, onGraphChange],
  );

  const requestDelete = useCallback(
    (id: string) => {
      const node = graph.nodes.find((n) => n.id === id);
      if (!node) return;
      const count = counts.get(id) ?? 0;
      if (count === 0) performDelete(id);
      else setConfirmDelete({ id, label: node.data.label, count });
    },
    [graph, counts, performDelete],
  );

  const confirmDeleteNow = useCallback(() => {
    setConfirmDelete((pending) => {
      if (pending) performDelete(pending.id);
      return null;
    });
  }, [performDelete]);
  const cancelDelete = useCallback(() => setConfirmDelete(null), []);

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
        rootId,
        pendingEditId,
        onToggleCollapse: toggleCollapse,
        onRename: renameNode,
        onAddChild: addChild,
        onDelete: requestDelete,
        onAutoEditDone: clearPendingEdit,
      }),
    [nodes, hidden, collapsed, children, counts, search.matches, search.activeId, search.query, rootId, pendingEditId, toggleCollapse, renameNode, addChild, requestDelete, clearPendingEdit],
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
    confirmDelete,
    confirmDeleteNow,
    cancelDelete,
  };
}
