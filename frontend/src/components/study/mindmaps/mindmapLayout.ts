/**
 * Radial layout for a 3-level mindmap tree.
 *
 * Geometry:
 *   - Root sits at (0, 0)
 *   - Level-1 nodes are placed at radius `R1`, spaced evenly around the full
 *     circle, starting at 12 o'clock and going clockwise.
 *   - Level-2 nodes for each L1 node are spread in an arc centered on the
 *     parent's angle, fanned out within a third of the sibling sector so
 *     they don't collide with the neighbouring L1's children.
 *
 * Pure function: takes a tree, returns `{ nodes, edges, bounds }` ready for
 * the SVG renderer.
 */

import type { Edge, MindmapLayout, MindmapNode, PositionedNode } from "./types";

const R1 = 260;
const R2 = 480;

export function layoutRadial(root: MindmapNode): MindmapLayout {
  const nodes: PositionedNode[] = [];
  const edges: Edge[] = [];

  nodes.push({ id: "root", label: root.label, level: 0, x: 0, y: 0 });

  const l1Children = root.children ?? [];
  const n = Math.max(l1Children.length, 1);

  l1Children.forEach((branch, i) => {
    // Start at -90deg (top), go clockwise.
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const id = `n1-${i}`;
    nodes.push({
      id,
      label: branch.label,
      level: 1,
      x: Math.cos(angle) * R1,
      y: Math.sin(angle) * R1,
      parentId: "root",
    });
    edges.push({ id: `e-root-${id}`, from: "root", to: id });

    const subs = branch.children ?? [];
    const sectorWidth = (2 * Math.PI) / n;
    // Use ~⅔ of the sector so siblings don't crowd each other.
    const arcSpan = sectorWidth * 0.66;
    const arcStart = angle - arcSpan / 2;

    subs.forEach((sub, j) => {
      // When there's exactly one sub, place it on the parent's ray.
      const t = subs.length === 1 ? 0.5 : j / (subs.length - 1);
      const subAngle = arcStart + t * arcSpan;
      const subId = `n2-${i}-${j}`;
      nodes.push({
        id: subId,
        label: sub.label,
        level: 2,
        x: Math.cos(subAngle) * R2,
        y: Math.sin(subAngle) * R2,
        parentId: id,
      });
      edges.push({ id: `e-${id}-${subId}`, from: id, to: subId });
    });
  });

  // Compute bounds for the viewBox + auto-fit.
  const PAD = 120;
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const minX = Math.min(...xs) - PAD;
  const maxX = Math.max(...xs) + PAD;
  const minY = Math.min(...ys) - PAD;
  const maxY = Math.max(...ys) + PAD;

  return { nodes, edges, bounds: { minX, minY, maxX, maxY } };
}
