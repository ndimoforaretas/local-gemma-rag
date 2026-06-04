/**
 * Position React Flow nodes with dagre (clean hierarchical layout).
 *
 * React Flow doesn't auto-layout, so we run dagre over the nodes/edges to get
 * x/y, honouring the chosen direction (LR = left-right, TB = top-down). Node
 * sizes are estimated from the label so dagre spaces them without overlap.
 */

import dagre from "@dagrejs/dagre";
import { Position, type Edge } from "@xyflow/react";
import type { MindmapFlowNode } from "./treeToFlow";

export type FlowDirection = "LR" | "TB";

const NODE_WIDTH = 190;

/** Estimate a node's rendered height from its label (≈22 chars/line, wraps). */
function estimateHeight(label: string): number {
  const lines = Math.max(1, Math.ceil(label.length / 22));
  return 24 + lines * 20; // padding + line height
}

export function layoutWithDagre(
  nodes: MindmapFlowNode[],
  edges: Edge[],
  direction: FlowDirection,
): MindmapFlowNode[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: 28,
    ranksep: 70,
    marginx: 16,
    marginy: 16,
  });

  for (const n of nodes) {
    g.setNode(n.id, { width: NODE_WIDTH, height: estimateHeight(n.data.label) });
  }
  for (const e of edges) g.setEdge(e.source, e.target);

  dagre.layout(g);

  const isLR = direction === "LR";
  return nodes.map((n) => {
    const { x, y, width, height } = g.node(n.id);
    return {
      ...n,
      // dagre gives node centre; React Flow wants the top-left corner.
      position: { x: x - width / 2, y: y - height / 2 },
      sourcePosition: isLR ? Position.Right : Position.Bottom,
      targetPosition: isLR ? Position.Left : Position.Top,
    };
  });
}
