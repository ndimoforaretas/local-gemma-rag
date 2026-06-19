/**
 * Floating actions above a selected node (React Flow NodeToolbar):
 * add a child topic, recolour (opens the swatch picker), delete the branch.
 * The root offers no delete.
 */

import { useState } from "react";
import { NodeToolbar, Position } from "@xyflow/react";
import { useTranslation } from "react-i18next";
import { Palette, Plus, Trash2 } from "lucide-react";
import { NodeColorPicker } from "./NodeColorPicker";
import type { NodeColor } from "./nodeColors";

export function NodeActionsToolbar({
  visible,
  isRoot,
  color,
  onAddChild,
  onDelete,
  onRecolor,
}: {
  visible: boolean;
  isRoot: boolean;
  color: string | null;
  onAddChild: () => void;
  onDelete: () => void;
  onRecolor: (color: NodeColor | null, wholeBranch: boolean) => void;
}) {
  const { t } = useTranslation("study");
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <NodeToolbar
      isVisible={visible}
      position={Position.Top}
      offset={8}
      className="flex flex-col items-center gap-1.5"
    >
      <div className="flex gap-1">
        <Btn title={t("mindmap.canvas.addChild")} onClick={onAddChild}>
          <Plus size={13} />
        </Btn>
        <Btn
          title={t("mindmap.canvas.recolor")}
          onClick={() => setPickerOpen((o) => !o)}
          active={pickerOpen}
        >
          <Palette size={13} />
        </Btn>
        {!isRoot && (
          <Btn title={t("mindmap.canvas.deleteNode")} onClick={onDelete} danger>
            <Trash2 size={13} />
          </Btn>
        )}
      </div>
      {pickerOpen && visible && (
        <NodeColorPicker
          current={color}
          onPick={(c, branch) => {
            setPickerOpen(false);
            onRecolor(c, branch);
          }}
        />
      )}
    </NodeToolbar>
  );
}

function Btn({
  title,
  onClick,
  danger,
  active,
  children,
}: {
  title: string;
  onClick: () => void;
  danger?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`nodrag nopan flex items-center justify-center w-7 h-7 rounded-lg border shadow-sm transition-colors ${
        active
          ? "bg-[#a855f7] border-[#a855f7] text-white"
          : danger
            ? "bg-white/95 dark:bg-[#191b23]/95 border-[#c2c6d6] dark:border-[#424754] text-rose-500 hover:border-rose-400 hover:bg-rose-500/10"
            : "bg-white/95 dark:bg-[#191b23]/95 border-[#c2c6d6] dark:border-[#424754] text-ink-strong hover:border-[#a855f7]/60 hover:bg-[#a855f7]/10"
      }`}
    >
      {children}
    </button>
  );
}
