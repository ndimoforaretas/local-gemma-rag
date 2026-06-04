/**
 * Convert a MindmapNode tree → React Flow nodes + edges.
 *
 * Node ids are stable (depth-first index: n0, n1, …) so saved drag positions
 * map back reliably across reloads. `level` drives per-tier node styling.
 */

import type { Edge, Node } from "@xyflow/react";
import type { MindmapNode } from "./types";

export interface FlowNodeData extends Record<string, unknown> {
  label: string;
  level: 0 | 1 | 2;
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
