/**
 * Pure helpers that turn the base tree graph into what React Flow renders:
 * dagre layout + saved drag positions, collapse-hiding, search highlight/dim,
 * and edge styling. Kept out of the components so each stays small.
 */

import type { Edge } from "@xyflow/react";
import { layoutWithDagre } from "./layoutWithDagre";
import type { FlowGraph, MindmapFlowNode } from "./treeToFlow";
import type { MindmapLayout } from "./types";

export type NodePositions = Record<string, { x: number; y: number }>;

/** Auto-layout with dagre, then re-apply any manually dragged positions. */
export function layoutNodes(
  graph: FlowGraph,
  layout: MindmapLayout,
  positions: NodePositions | null,
): MindmapFlowNode[] {
  const laid = layoutWithDagre(graph.nodes, graph.edges, layout === "TD" ? "TB" : "LR");
  if (!positions || !Object.keys(positions).length) return laid;
  // Saved positions win. Nodes added after the save (no entry yet) are placed
  // at their parent's saved position plus the dagre offset, so a new child
  // appears next to its (possibly dragged) parent instead of a far-off spot.
  const dagrePos = new Map(laid.map((n) => [n.id, n.position]));
  const parentOf = new Map(graph.edges.map((e) => [e.target, e.source]));
  return laid.map((n) => {
    if (positions[n.id]) return { ...n, position: positions[n.id] };
    const parent = parentOf.get(n.id);
    const parentSaved = parent ? positions[parent] : undefined;
    const parentDagre = parent ? dagrePos.get(parent) : undefined;
    if (parentSaved && parentDagre) {
      return {
        ...n,
        position: {
          x: parentSaved.x + (n.position.x - parentDagre.x),
          y: parentSaved.y + (n.position.y - parentDagre.y),
        },
      };
    }
    return n;
  });
}

/** parent id → direct child ids (from the tree edges). */
export function buildChildrenMap(edges: Edge[]): Map<string, string[]> {
  const children = new Map<string, string[]>();
  for (const e of edges) {
    const list = children.get(e.source);
    if (list) list.push(e.target);
    else children.set(e.source, [e.target]);
  }
  return children;
}

/** node id → total descendant count (for the collapsed "+N" badge). */
export function descendantCounts(children: Map<string, string[]>): Map<string, number> {
  const counts = new Map<string, number>();
  const count = (id: string): number => {
    const memo = counts.get(id);
    if (memo !== undefined) return memo;
    let total = 0;
    for (const child of children.get(id) ?? []) total += 1 + count(child);
    counts.set(id, total);
    return total;
  };
  for (const id of children.keys()) count(id);
  return counts;
}

/** All nodes hidden because an ancestor is collapsed. */
export function hiddenByCollapse(
  children: Map<string, string[]>,
  collapsed: Set<string>,
): Set<string> {
  const hidden = new Set<string>();
  const stack: string[] = [];
  for (const id of collapsed) stack.push(...(children.get(id) ?? []));
  while (stack.length) {
    const id = stack.pop()!;
    if (hidden.has(id)) continue;
    hidden.add(id);
    stack.push(...(children.get(id) ?? []));
  }
  return hidden;
}

export interface NodeDecorations {
  hidden: Set<string>;
  collapsed: Set<string>;
  children: Map<string, string[]>;
  counts: Map<string, number>;
  matches: Set<string>;
  activeMatchId: string | null;
  searching: boolean;
  rootId: string | null;
  /** Newly added node that should open its rename editor on mount. */
  pendingEditId: string | null;
  onToggleCollapse: (id: string) => void;
  onRename: (id: string, label: string) => void;
  onAddChild: (id: string) => void;
  onDelete: (id: string) => void;
  onAutoEditDone: () => void;
}

/** Apply collapse visibility + search flags onto the laid-out nodes. */
export function decorateNodes(
  nodes: MindmapFlowNode[],
  d: NodeDecorations,
): MindmapFlowNode[] {
  return nodes.map((n) => ({
    ...n,
    hidden: d.hidden.has(n.id),
    data: {
      ...n.data,
      hasChildren: (d.children.get(n.id) ?? []).length > 0,
      collapsed: d.collapsed.has(n.id),
      hiddenCount: d.counts.get(n.id) ?? 0,
      match: d.matches.has(n.id),
      activeMatch: n.id === d.activeMatchId,
      dimmed: d.searching && !d.matches.has(n.id),
      isRoot: n.id === d.rootId,
      autoEdit: n.id === d.pendingEditId,
      onToggleCollapse: d.onToggleCollapse,
      onRename: d.onRename,
      onAddChild: d.onAddChild,
      onDelete: d.onDelete,
      onAutoEditDone: d.onAutoEditDone,
    },
  }));
}

/** Style edges for the theme and hide those touching a hidden node. */
export function decorateEdges(edges: Edge[], hidden: Set<string>, isDark: boolean): Edge[] {
  return edges.map((e) => ({
    ...e,
    type: "smoothstep",
    hidden: hidden.has(e.source) || hidden.has(e.target),
    selectable: false,
    focusable: false,
    style: { stroke: isDark ? "#a855f7" : "#9333ea", strokeWidth: 1.5 },
  }));
}
