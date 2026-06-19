/**
 * Custom React Flow node for the mindmap — a real HTML box, so text wraps and
 * sizes to content (no SVG truncation) and uses the app's design tokens.
 *
 * Three tiers: root (gradient), theme (purple-tinted), leaf (subtle). Renders
 * the decoration flags from useMindmapCanvas (search highlight/dim, collapse
 * toggle), double-click inline rename (NodeLabelEditor; auto-opens for a
 * just-added node), and a selection toolbar (add child / delete branch).
 */

import { useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { COLOR_TINTS, isNodeColor } from "./nodeColors";
import type { MindmapFlowNode as MindmapNodeType } from "./treeToFlow";
import { NodeActionsToolbar } from "./NodeActionsToolbar";
import { NodeCollapseToggle } from "./NodeCollapseToggle";
import { NodeLabelEditor } from "./NodeLabelEditor";

const TIER: Record<number, string> = {
  0: "bg-gradient-to-br from-[#a855f7] to-[#ec4899] text-white border-transparent font-bold shadow-lg shadow-[#a855f7]/20",
  1: "bg-[#a855f7]/12 border-[#a855f7]/60 text-ink-strong font-semibold",
  2: "bg-white dark:bg-[#191b23] border-[#c2c6d6] dark:border-[#424754] text-ink",
};

const TIER_FONT: Record<number, string> = { 0: "font-bold", 1: "font-semibold", 2: "" };

/** A user colour replaces the tier background/border but keeps the weight. */
function nodeSkin(level: number, color: string | null | undefined): string {
  if (isNodeColor(color)) {
    return `${COLOR_TINTS[color]} text-ink-strong ${TIER_FONT[level] ?? ""}`;
  }
  return TIER[level] ?? TIER[2];
}

export function MindmapFlowNode({
  id,
  data,
  selected,
  sourcePosition,
  targetPosition,
}: NodeProps<MindmapNodeType>) {
  // A just-added node mounts straight into editing (autoEdit).
  const [editing, setEditing] = useState(!!data.autoEdit);

  const tier = nodeSkin(data.level, data.color);
  const ring = data.activeMatch
    ? "ring-2 ring-[#a855f7] ring-offset-2 ring-offset-white dark:ring-offset-[#10131a]"
    : data.match
      ? "ring-2 ring-[#a855f7]/40"
      : "";
  const sourceSide = sourcePosition ?? Position.Right;

  const startEdit = (e: React.MouseEvent) => {
    if (!data.onRename) return;
    e.stopPropagation();
    setEditing(true);
  };
  const finishEdit = () => {
    setEditing(false);
    if (data.autoEdit) data.onAutoEditDone?.();
  };

  return (
    <div
      onDoubleClick={startEdit}
      className={`relative px-3.5 py-2 rounded-xl border text-sm leading-snug text-center max-w-[200px] break-words transition-opacity ${tier} ${ring} ${
        data.dimmed ? "opacity-25" : ""
      }`}
    >
      <NodeActionsToolbar
        visible={!!selected && !editing && !!data.onAddChild}
        isRoot={!!data.isRoot}
        color={data.color ?? null}
        onAddChild={() => data.onAddChild?.(id)}
        onDelete={() => data.onDelete?.(id)}
        onRecolor={(color, branch) => data.onRecolor?.(id, color, branch)}
      />
      <Handle
        type="target"
        position={targetPosition ?? Position.Left}
        className="!bg-[#a855f7] !w-1.5 !h-1.5 !border-0"
      />
      {editing ? (
        <NodeLabelEditor
          initial={data.label}
          onCommit={(value) => {
            finishEdit();
            data.onRename?.(id, value);
          }}
          onCancel={finishEdit}
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
