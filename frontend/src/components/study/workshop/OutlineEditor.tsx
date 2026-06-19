/**
 * Edit mode for the workshop outline: rename, reorder (↑/↓) and delete
 * lessons in a local draft, then save in ONE atomic PATCH (or cancel).
 * Deleting a lesson that already has content asks for confirmation.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Check, Loader2, X } from "lucide-react";
import { ConfirmationModal } from "../../ConfirmationModal";
import type { WorkshopLesson } from "./types";
import { OutlineEditorRow } from "./OutlineEditorRow";

interface DraftRow {
  old_idx: number;
  title: string;
  hasContent: boolean;
}

export function OutlineEditor({
  lessons,
  isSaving,
  error,
  onSave,
  onCancel,
}: {
  lessons: WorkshopLesson[];
  isSaving: boolean;
  error: string | null;
  onSave: (rows: { old_idx: number; title: string }[]) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation("study");
  const [rows, setRows] = useState<DraftRow[]>(() =>
    [...lessons]
      .sort((a, b) => a.lesson_idx - b.lesson_idx)
      .map((l) => ({
        old_idx: l.lesson_idx,
        title: l.title,
        hasContent: l.has_content || l.completed_at != null,
      })),
  );
  const [confirmPos, setConfirmPos] = useState<number | null>(null);

  const move = (pos: number, dir: -1 | 1) =>
    setRows((r) => {
      const next = [...r];
      const [row] = next.splice(pos, 1);
      next.splice(pos + dir, 0, row);
      return next;
    });
  const removeAt = (pos: number) => setRows((r) => r.filter((_, i) => i !== pos));
  const requestDelete = (pos: number) => {
    if (rows[pos].hasContent) setConfirmPos(pos);
    else removeAt(pos);
  };

  const canSave = rows.length >= 1 && rows.every((r) => r.title.trim()) && !isSaving;

  return (
    <div className="space-y-2">
      {rows.map((row, pos) => (
        <OutlineEditorRow
          key={row.old_idx}
          title={row.title}
          position={pos}
          count={rows.length}
          onRename={(title) =>
            setRows((r) => r.map((x, i) => (i === pos ? { ...x, title } : x)))
          }
          onMoveUp={() => move(pos, -1)}
          onMoveDown={() => move(pos, 1)}
          onDelete={() => requestDelete(pos)}
        />
      ))}

      {error && (
        <div className="flex items-center gap-2 text-sm text-rose-500">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#c2c6d6] dark:border-[#424754] hover:bg-[#a855f7]/10 text-ink-strong text-sm font-medium transition-colors"
        >
          <X size={14} /> {t("workshop.outline.editCancel")}
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={() =>
            onSave(rows.map(({ old_idx, title }) => ({ old_idx, title: title.trim() })))
          }
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#a855f7] hover:bg-[#9333ea] disabled:bg-[#a855f7]/40 text-white text-sm font-medium transition-colors"
        >
          {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}{" "}
          {t("workshop.outline.editSave")}
        </button>
      </div>

      <ConfirmationModal
        isOpen={confirmPos !== null}
        title={t("workshop.outline.deleteLessonTitle")}
        message={t("workshop.outline.deleteLessonMessage", {
          title: confirmPos !== null ? rows[confirmPos]?.title : "",
        })}
        confirmLabel={t("workshop.outline.deleteLessonConfirm")}
        cancelLabel={t("workshop.outline.deleteLessonCancel")}
        type="destructive"
        onConfirm={() => {
          if (confirmPos !== null) removeAt(confirmPos);
          setConfirmPos(null);
        }}
        onCancel={() => setConfirmPos(null)}
      />
    </div>
  );
}
