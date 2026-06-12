/**
 * One row of the outline editor: position badge, inline title input,
 * move up/down arrows, delete. Pure presentation — state lives in OutlineEditor.
 */

import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

export function OutlineEditorRow({
  title,
  position,
  count,
  onRename,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  title: string;
  position: number;
  count: number;
  onRename: (title: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation("study");
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl border border-[#c2c6d6] dark:border-[#424754] bg-white dark:bg-[#191b23]">
      <div className="shrink-0 w-8 h-8 rounded-full bg-[#a855f7]/10 text-[#a855f7] dark:text-[#ddb7ff] font-semibold flex items-center justify-center text-sm tabular-nums">
        {position + 1}
      </div>
      <input
        type="text"
        value={title}
        onChange={(e) => onRename(e.target.value)}
        aria-label={t("workshop.outline.renameLesson")}
        className="flex-1 min-w-0 bg-transparent text-sm font-medium text-ink-strong outline-none border-b border-transparent focus:border-[#a855f7]/60 py-0.5 transition-colors"
      />
      <IconBtn title={t("workshop.outline.moveUp")} disabled={position === 0} onClick={onMoveUp}>
        <ArrowUp size={14} />
      </IconBtn>
      <IconBtn
        title={t("workshop.outline.moveDown")}
        disabled={position === count - 1}
        onClick={onMoveDown}
      >
        <ArrowDown size={14} />
      </IconBtn>
      <IconBtn
        title={t("workshop.outline.deleteLesson")}
        disabled={count <= 1}
        onClick={onDelete}
        danger
      >
        <Trash2 size={14} />
      </IconBtn>
    </div>
  );
}

function IconBtn({
  title,
  disabled,
  danger,
  onClick,
  children,
}: {
  title: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={`shrink-0 p-1.5 rounded-lg border border-transparent transition-colors disabled:opacity-30 ${
        danger
          ? "text-rose-500 hover:border-rose-400 hover:bg-rose-500/10"
          : "text-ink-muted hover:text-ink-strong hover:border-[#a855f7]/40 hover:bg-[#a855f7]/10"
      }`}
    >
      {children}
    </button>
  );
}
