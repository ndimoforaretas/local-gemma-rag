/**
 * Single-mindmap view: header (title + counts) + a React Flow canvas with
 * drag-to-rearrange, layout direction toggle, and export. Manual drag positions
 * persist; "Reset layout" returns to the auto (dagre) layout. Once the user
 * edits the map (e.g. renames a node) it forks into a user-owned graph;
 * "Reset to AI version" discards the fork and returns to the generated tree.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Mindmap, MindmapGraph, MindmapLayout } from "./types";
import type { NodePositions } from "./ReactFlowMindmap";
import { ReactFlowMindmap } from "./ReactFlowMindmap";
import { LayoutPicker } from "./LayoutPicker";
import { ConfirmationModal } from "../../ConfirmationModal";
import { RotateCcw, Sparkles } from "lucide-react";

const BTN =
  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#c2c6d6] dark:border-[#424754] hover:bg-[#a855f7]/10 hover:border-[#a855f7]/50 text-ink-strong text-sm font-medium transition-colors";

export function MindmapView({
  mindmap,
  onExported,
  onSaveLayout,
  onSavePositions,
  onSaveGraph,
}: {
  mindmap: Mindmap;
  onExported: () => void;
  onSaveLayout: (layout: MindmapLayout) => void;
  /** Persist (positions) or reset (null) the manual node layout. */
  onSavePositions: (positions: NodePositions | null) => void;
  /** Persist (graph) or reset-to-AI (null) the user-edited structure. */
  onSaveGraph: (graph: MindmapGraph | null) => void;
}) {
  const { t } = useTranslation("study");
  const [confirmReset, setConfirmReset] = useState(false);
  // Default to the recommended LR (coerce any legacy 'radial' value).
  const layout: MindmapLayout = mindmap.layout === "TD" ? "TD" : "LR";
  const hasManual = !!mindmap.node_positions;
  const isForked = !!mindmap.graph;

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider font-semibold inline-block px-2 py-0.5 rounded-full bg-[#a855f7]/15 text-[#a855f7] dark:text-[#ddb7ff] mb-2">
            {t("mindmap.view.meta", {
              themes: mindmap.tree.children.length,
              subtopics: mindmap.tree.children.reduce((a, c) => a + (c.children?.length ?? 0), 0),
            })}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink-strong">
            {mindmap.title}
          </h1>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-muted">
          {t("mindmap.view.hint")}
        </p>
        <div className="flex items-center gap-2">
          {isForked && (
            <button type="button" onClick={() => setConfirmReset(true)} className={BTN}>
              <Sparkles size={14} /> {t("mindmap.view.resetToAi")}
            </button>
          )}
          {hasManual && (
            <button type="button" onClick={() => onSavePositions(null)} className={BTN}>
              <RotateCcw size={14} /> {t("mindmap.view.resetLayout")}
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
        onGraphChange={onSaveGraph}
        onExported={onExported}
      />

      <ConfirmationModal
        isOpen={confirmReset}
        title={t("mindmap.view.resetGraphTitle")}
        message={t("mindmap.view.resetGraphMessage", { title: mindmap.title })}
        confirmLabel={t("mindmap.view.resetGraphConfirm")}
        cancelLabel={t("mindmap.view.resetGraphCancel")}
        type="warning"
        onConfirm={() => {
          setConfirmReset(false);
          onSaveGraph(null);
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}
