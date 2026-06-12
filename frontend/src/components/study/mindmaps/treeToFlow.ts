/**
 * Convert a MindmapNode tree → React Flow nodes + edges.
 *
 * Node ids are stable (depth-first index: n0, n1, …) so saved drag positions
 * map back reliably across reloads. `level` drives per-tier node styling.
 */

import type { Edge, Node } from "@xyflow/react";
import type { MindmapGraph, MindmapNode } from "./types";

export interface FlowNodeData extends Record<string, unknown> {
  label: string;
  level: 0 | 1 | 2;
  // Decoration flags applied per render by flowDecorations.decorateNodes.
  hasChildren?: boolean;
  collapsed?: boolean;
  hiddenCount?: number;
  match?: boolean;
  activeMatch?: boolean;
  dimmed?: boolean;
  isRoot?: boolean;
  /** Open the rename editor on mount (set for a just-added node). */
  autoEdit?: boolean;
  onToggleCollapse?: (id: string) => void;
  onRename?: (id: string, label: string) => void;
  onAddChild?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAutoEditDone?: () => void;
}

export type MindmapFlowNode = Node<FlowNodeData, "mindmap">;

export interface FlowGraph {
  nodes: MindmapFlowNode[];
  edges: Edge[];
}

export function treeToFlow(root: MindmapNode): FlowGraph {
  const nodes: MindmapFlowNode[] = [];
  const edges: Edge[] = [];
  let counter = 0;

  const walk = (node: MindmapNode, depth: number): string => {
    const id = `n${counter++}`;
    const level = (depth > 2 ? 2 : depth) as 0 | 1 | 2;
    nodes.push({
      id,
      type: "mindmap",
      position: { x: 0, y: 0 }, // real positions come from the layout pass
      data: { label: node.label || "(untitled)", level },
    });
    for (const child of node.children ?? []) {
      const childId = walk(child, depth + 1);
      edges.push({ id: `e${id}-${childId}`, source: id, target: childId });
    }
    return id;
  };

  walk(root, 0);
  return { nodes, edges };
}

const clampLevel = (level: number): 0 | 1 | 2 =>
  (level < 0 ? 0 : level > 2 ? 2 : level) as 0 | 1 | 2;

/** Build the flow graph from a user-edited graph (Option B fork). */
export function graphToFlow(graph: MindmapGraph): FlowGraph {
  return {
    nodes: graph.nodes.map((n) => ({
      id: n.id,
      type: "mindmap" as const,
      position: { x: 0, y: 0 }, // real positions come from the layout pass
      data: { label: n.label || "(untitled)", level: clampLevel(n.level) },
    })),
    edges: graph.edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
  };
}

/** Serialise the rendered flow graph back to the persisted structure shape. */
export function flowToGraph(flow: FlowGraph): MindmapGraph {
  return {
    nodes: flow.nodes.map((n) => ({ id: n.id, label: n.data.label, level: n.data.level })),
    edges: flow.edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
  };
}
