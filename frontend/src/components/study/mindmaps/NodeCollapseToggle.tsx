/**
 * Collapse/expand toggle on branch nodes — sits on the node's source side
 * ("−" to collapse; a purple "+N" badge with the hidden count when collapsed).
 */

import { Position } from "@xyflow/react";
import { useTranslation } from "react-i18next";

export function NodeCollapseToggle({
  collapsed,
  hiddenCount,
  sourceSide,
  onToggle,
}: {
  collapsed: boolean;
  hiddenCount: number;
  sourceSide: Position;
  onToggle: () => void;
}) {
  const { t } = useTranslation("study");
  const title = collapsed
    ? t("mindmap.canvas.expandBranch", { count: hiddenCount })
    : t("mindmap.canvas.collapseBranch");

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      title={title}
      aria-label={title}
      aria-expanded={!collapsed}
      className={`nodrag nopan absolute z-10 flex items-center justify-center min-w-[18px] h-[18px] px-0.5 rounded-full border text-[10px] font-semibold leading-none transition-colors ${
        sourceSide === Position.Bottom
          ? "left-1/2 -translate-x-1/2 -bottom-[9px]"
          : "top-1/2 -translate-y-1/2 -right-[9px]"
      } ${
        collapsed
          ? "bg-[#a855f7] border-[#a855f7] text-white"
          : "bg-white dark:bg-[#191b23] border-[#c2c6d6] dark:border-[#424754] text-ink-muted hover:border-[#a855f7] hover:text-[#a855f7]"
      }`}
    >
      {collapsed ? `+${hiddenCount}` : "−"}
    </button>
  );
}
