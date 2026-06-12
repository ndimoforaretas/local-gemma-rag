/**
 * Structural edits on the mindmap graph (Option B). Pure helpers — they take
 * the rendered FlowGraph and return the next persisted MindmapGraph shape.
 * New node ids use a `u` prefix so they can never collide with the
 * tree-derived `n` ids; the max+1 counter means ids are never reused.
 */

import { buildChildrenMap } from "./flowDecorations";
import { flowToGraph, type FlowGraph } from "./treeToFlow";
import type { MindmapGraph } from "./types";

function nextNodeId(graph: FlowGraph, reserved?: Iterable<string>): string {
  let max = 0;
  const consider = (id: string) => {
    const m = /^u(\d+)$/.exec(id);
    if (m) max = Math.max(max, Number(m[1]));
  };
  for (const n of graph.nodes) consider(n.id);
  // Ids referenced elsewhere (e.g. saved drag positions of since-deleted
  // nodes) are reserved too, so a recycled id can't inherit a stale position.
  for (const id of reserved ?? []) consider(id);
  return `u${max + 1}`;
}

/** The root is the only node that is never an edge target. */
export function findRootId(graph: FlowGraph): string | null {
  const targets = new Set(graph.edges.map((e) => e.target));
  return graph.nodes.find((n) => !targets.has(n.id))?.id ?? null;
}

/** Append a new child under `parentId` (one tier down, capped at leaf). */
export function addChildNode(
  graph: FlowGraph,
  parentId: string,
  label: string,
  reservedIds?: Iterable<string>,
): { next: MindmapGraph; newId: string } | null {
  const parent = graph.nodes.find((n) => n.id === parentId);
  if (!parent) return null;
  const newId = nextNodeId(graph, reservedIds);
  const next = flowToGraph(graph);
  next.nodes.push({
    id: newId,
    label,
    level: Math.min(parent.data.level + 1, 2) as 0 | 1 | 2,
  });
  next.edges.push({ id: `e${parentId}-${newId}`, source: parentId, target: newId });
  return { next, newId };
}

/** Remove a node and its whole subtree. Refuses the root (returns null). */
export function deleteBranch(graph: FlowGraph, nodeId: string): MindmapGraph | null {
  if (nodeId === findRootId(graph)) return null;
  const children = buildChildrenMap(graph.edges);
  const doomed = new Set([nodeId]);
  const stack = [...(children.get(nodeId) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (doomed.has(id)) continue;
    doomed.add(id);
    stack.push(...(children.get(id) ?? []));
  }
  const next = flowToGraph(graph);
  next.nodes = next.nodes.filter((n) => !doomed.has(n.id));
  next.edges = next.edges.filter((e) => !doomed.has(e.source) && !doomed.has(e.target));
  return next;
}
