/**
 * Full-page lesson reader: rendered markdown + Mark complete + Back to outline.
 *
 * Uses `marked` (already in the bundle for chat) to render the lesson body.
 * Completion state is owned by the parent — this view just exposes a button.
 */

import { useMemo } from "react";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { marked } from "marked";
import type { LessonContent } from "./types";

export function LessonView({
  lesson,
  isLoading,
  isCompleted,
  isMarking,
  onBack,
  onMarkComplete,
}: {
  lesson: LessonContent | undefined;
  isLoading: boolean;
  isCompleted: boolean;
  isMarking: boolean;
  onBack: () => void;
  onMarkComplete: () => void;
}) {
  const html = useMemo(
    () => (lesson ? (marked.parse(lesson.content_md) as string) : ""),
    [lesson?.content_md],
  );

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-[#424754] dark:text-[#c2c6d6] hover:text-[#191c1e] dark:hover:text-white"
      >
        <ArrowLeft size={14} />
        Back to lessons
      </button>

      {isLoading && (
        <div className="flex items-center gap-2 p-8 rounded-2xl border border-[#c2c6d6] dark:border-[#424754] bg-white dark:bg-[#191b23] text-[#727785]">
          <Loader2 size={18} className="animate-spin" />
          <span>Loading lesson…</span>
        </div>
      )}

      {!isLoading && lesson && (
        <article className="p-6 sm:p-8 rounded-2xl border border-[#c2c6d6] dark:border-[#424754] bg-white dark:bg-[#191b23] prose prose-sm dark:prose-invert max-w-none">
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </article>
      )}

      {!isLoading && lesson && (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onMarkComplete}
            disabled={isCompleted || isMarking}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-colors ${
              isCompleted
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 cursor-default"
                : "bg-[#a855f7] hover:bg-[#9333ea] disabled:bg-[#a855f7]/40 text-white"
            }`}
          >
            {isMarking ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Saving…
              </>
            ) : isCompleted ? (
              <>
                <CheckCircle2 size={14} /> Lesson completed
              </>
            ) : (
              <>
                <CheckCircle2 size={14} /> Mark complete
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
