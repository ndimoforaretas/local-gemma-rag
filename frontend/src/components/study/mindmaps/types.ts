/**
 * Shared types for Mindmaps Mode.
 */

export type MindmapsPhase = "list" | "config" | "view";

/** Layout for the auto-generated diagram. */
export type MindmapLayout = "TD" | "LR";

export type {
  Mindmap,
  MindmapListItem,
  MindmapNode,
} from "../../../types/api";
