/**
 * Shared types for Mindmaps Mode.
 */

export type MindmapsPhase = "list" | "config" | "view";

export type {
  Mindmap,
  MindmapListItem,
  MindmapNode,
} from "../../../types/api";

/** A node positioned by the radial layout, ready for SVG rendering. */
export interface PositionedNode {
  id: string;          // stable per-node id, used for React keys
  label: string;
  level: 0 | 1 | 2;
  x: number;
  y: number;
  /** Parent id; undefined for the root. */
  parentId?: string;
}

export interface Edge {
  id: string;
  from: string;
  to: string;
}

export interface MindmapLayout {
  nodes: PositionedNode[];
  edges: Edge[];
  /** Computed bounding box for fitting the viewport. */
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}
