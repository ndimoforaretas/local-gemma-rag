/**
 * Preset node colours for the mindmap (design-system palette only — no
 * free-form picker). The key is what's persisted in graph_json; the classes
 * tint the node like the theme tier so light/dark mode both work.
 */

export const NODE_COLORS = ["purple", "pink", "emerald", "amber", "sky", "rose"] as const;
export type NodeColor = (typeof NODE_COLORS)[number];

/** Tinted background/border per colour (mirrors the tier-1 treatment). */
export const COLOR_TINTS: Record<NodeColor, string> = {
  purple: "bg-[#a855f7]/12 border-[#a855f7]/60",
  pink: "bg-[#ec4899]/12 border-[#ec4899]/60",
  emerald: "bg-[#10b981]/12 border-[#10b981]/60",
  amber: "bg-[#f59e0b]/12 border-[#f59e0b]/60",
  sky: "bg-[#0ea5e9]/12 border-[#0ea5e9]/60",
  rose: "bg-[#f43f5e]/12 border-[#f43f5e]/60",
};

/** Solid hex per colour — swatch dots and the MiniMap. */
export const COLOR_HEX: Record<NodeColor, string> = {
  purple: "#a855f7",
  pink: "#ec4899",
  emerald: "#10b981",
  amber: "#f59e0b",
  sky: "#0ea5e9",
  rose: "#f43f5e",
};

export function isNodeColor(value: unknown): value is NodeColor {
  return typeof value === "string" && (NODE_COLORS as readonly string[]).includes(value);
}
