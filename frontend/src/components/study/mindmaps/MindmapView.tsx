/**
 * Single-mindmap view: header (title + counts) + a React Flow canvas with
 * drag-to-rearrange, layout direction toggle, and export. Manual drag positions
 * persist; "Reset layout" returns to the auto (dagre) layout.
 */

import type { Mindmap, MindmapLayout } from "./types";
import type { NodePositions } from "./ReactFlowMindmap";
import { ReactFlowMindmap } from "./ReactFlowMindmap";
import { LayoutPicker } from "./LayoutPicker";
import { RotateCcw } from "lucide-react";

export function MindmapView({
  mindmap,
  onExported,
  onSaveLayout,
  onSavePositions,
}: {
  mindmap: Mindmap;
  onExported: () => void;
  onSaveLayout: (layout: MindmapLayout) => void;
  /** Persist (positions) or reset (null) the manual node layout. */
  onSavePositions: (positions: NodePositions | null) => void;
}) {
  // Default to the recommended LR (coerce any legacy 'radial' value).
  const layout: MindmapLayout = mindmap.layout === "TD" ? "TD" : "LR";
  const hasManual = !!mindmap.node_positions;

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider font-semibold inline-block px-2 py-0.5 rounded-full bg-[#a855f7]/15 text-[#a855f7] dark:text-[#ddb7ff] mb-2">
            {mindmap.tree.children.length} themes ·{" "}
            {mindmap.tree.children.reduce((a, c) => a + (c.children?.length ?? 0), 0)} sub-topics
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink-strong">
            {mindmap.title}
          </h1>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-muted">
          Drag nodes to rearrange · scroll to zoom · drag the background to pan
        </p>
        <div className="flex items-center gap-2">
          {hasManual && (
            <button
              type="button"
              onClick={() => onSavePositions(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#c2c6d6] dark:border-[#424754] hover:bg-[#a855f7]/10 hover:border-[#a855f7]/50 text-ink-strong text-sm font-medium transition-colors"
            >
              <RotateCcw size={14} /> Reset layout
            </button>
          )}
          <LayoutPicker value={layout} onChange={onSaveLayout} />
        </div>
      </div>

      <ReactFlowMindmap
        key={`${mindmap.id}-${layout}`}
        mindmap={mindmap}
        layout={layout}
        positions={mindmap.node_positions ?? null}
        onPositionsChange={onSavePositions}
        onExported={onExported}
      />
    </div>
  );
}
