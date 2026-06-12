/**
 * Floating actions above a selected node (React Flow NodeToolbar):
 * add a child topic, delete the branch. The root offers no delete.
 */

import { NodeToolbar, Position } from "@xyflow/react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";

export function NodeActionsToolbar({
  visible,
  isRoot,
  onAddChild,
  onDelete,
}: {
  visible: boolean;
  isRoot: boolean;
  onAddChild: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation("study");
  return (
    <NodeToolbar isVisible={visible} position={Position.Top} offset={8} className="flex gap-1">
      <Btn title={t("mindmap.canvas.addChild")} onClick={onAddChild}>
        <Plus size={13} />
      </Btn>
      {!isRoot && (
        <Btn title={t("mindmap.canvas.deleteNode")} onClick={onDelete} danger>
          <Trash2 size={13} />
        </Btn>
      )}
    </NodeToolbar>
  );
}

function Btn({
  title,
  onClick,
  danger,
  children,
}: {
  title: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`nodrag nopan flex items-center justify-center w-7 h-7 rounded-lg border bg-white/95 dark:bg-[#191b23]/95 border-[#c2c6d6] dark:border-[#424754] shadow-sm transition-colors ${
        danger
          ? "text-rose-500 hover:border-rose-400 hover:bg-rose-500/10"
          : "text-ink-strong hover:border-[#a855f7]/60 hover:bg-[#a855f7]/10"
      }`}
    >
      {children}
    </button>
  );
}
