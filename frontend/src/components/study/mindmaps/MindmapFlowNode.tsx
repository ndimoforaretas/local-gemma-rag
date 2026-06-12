/**
 * Custom React Flow node for the mindmap — a real HTML box, so text wraps and
 * sizes to content (no SVG truncation) and uses the app's design tokens.
 *
 * Three tiers: root (gradient), theme (purple-tinted), leaf (subtle). Renders
 * the decoration flags from useMindmapCanvas (search highlight/dim, collapse
 * toggle) and supports double-click inline rename (Enter/blur commits, Esc
 * cancels) via data.onRename.
 */

import { useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { MindmapFlowNode as MindmapNodeType } from "./treeToFlow";
import { NodeCollapseToggle } from "./NodeCollapseToggle";

const TIER: Record<number, string> = {
  0: "bg-gradient-to-br from-[#a855f7] to-[#ec4899] text-white border-transparent font-bold shadow-lg shadow-[#a855f7]/20",
  1: "bg-[#a855f7]/12 border-[#a855f7]/60 text-ink-strong font-semibold",
  2: "bg-white dark:bg-[#191b23] border-[#c2c6d6] dark:border-[#424754] text-ink",
};

export function MindmapFlowNode({
  id,
  data,
  sourcePosition,
  targetPosition,
}: NodeProps<MindmapNodeType>) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const tier = TIER[data.level] ?? TIER[2];
  const ring = data.activeMatch
    ? "ring-2 ring-[#a855f7] ring-offset-2 ring-offset-white dark:ring-offset-[#10131a]"
    : data.match
      ? "ring-2 ring-[#a855f7]/40"
      : "";
  const sourceSide = sourcePosition ?? Position.Right;

  const startEdit = (e: React.MouseEvent) => {
    if (!data.onRename) return;
    e.stopPropagation();
    setDraft(data.label);
    setEditing(true);
  };
  const commit = () => {
    setEditing(false);
    data.onRename?.(id, draft);
  };

  return (
    <div
      onDoubleClick={startEdit}
      className={`relative px-3.5 py-2 rounded-xl border text-sm leading-snug text-center max-w-[200px] break-words transition-opacity ${tier} ${ring} ${
        data.dimmed ? "opacity-25" : ""
      }`}
    >
      <Handle
        type="target"
        position={targetPosition ?? Position.Left}
        className="!bg-[#a855f7] !w-1.5 !h-1.5 !border-0"
      />
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => e.target.select()}
          onBlur={commit}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") commit();
            else if (e.key === "Escape") setEditing(false);
          }}
          className="nodrag nopan w-full min-w-[120px] bg-transparent text-center outline-none placeholder:opacity-50"
        />
      ) : (
        data.label
      )}
      <Handle
        type="source"
        position={sourceSide}
        className="!bg-[#a855f7] !w-1.5 !h-1.5 !border-0"
      />
      {data.hasChildren && (
        <NodeCollapseToggle
          collapsed={!!data.collapsed}
          hiddenCount={data.hiddenCount ?? 0}
          sourceSide={sourceSide}
          onToggle={() => data.onToggleCollapse?.(id)}
        />
      )}
    </div>
  );
}
