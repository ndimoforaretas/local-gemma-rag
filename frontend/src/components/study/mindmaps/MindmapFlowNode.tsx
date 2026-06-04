/**
 * Custom React Flow node for the mindmap — a real HTML box, so text wraps and
 * sizes to content (no SVG truncation) and uses the app's design tokens.
 *
 * Three tiers: root (gradient), theme (purple-tinted), leaf (subtle).
 */

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { MindmapFlowNode as MindmapNodeType } from "./treeToFlow";

const TIER: Record<number, string> = {
  0: "bg-gradient-to-br from-[#a855f7] to-[#ec4899] text-white border-transparent font-bold shadow-lg shadow-[#a855f7]/20",
  1: "bg-[#a855f7]/12 border-[#a855f7]/60 text-ink-strong font-semibold",
  2: "bg-white dark:bg-[#191b23] border-[#c2c6d6] dark:border-[#424754] text-ink",
};

export function MindmapFlowNode({
  data,
  sourcePosition,
  targetPosition,
}: NodeProps<MindmapNodeType>) {
  const tier = TIER[data.level] ?? TIER[2];
  return (
    <div
      className={`px-3.5 py-2 rounded-xl border text-sm leading-snug text-center max-w-[200px] break-words ${tier}`}
    >
      <Handle
        type="target"
        position={targetPosition ?? Position.Left}
        className="!bg-[#a855f7] !w-1.5 !h-1.5 !border-0"
      />
      {data.label}
      <Handle
        type="source"
        position={sourcePosition ?? Position.Right}
        className="!bg-[#a855f7] !w-1.5 !h-1.5 !border-0"
      />
    </div>
  );
}
