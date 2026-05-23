/**
 * One lesson card in the outline view: index, title, est minutes, status badge.
 */

import { Clock, CheckCircle2, Circle, ChevronRight } from "lucide-react";
import type { WorkshopLesson } from "./types";

export function LessonCard({
  lesson,
  onClick,
}: {
  lesson: WorkshopLesson;
  onClick: () => void;
}) {
  const done = lesson.completed_at != null;
  const started = lesson.has_content && !done;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-4 rounded-xl border border-[#c2c6d6] dark:border-[#424754] bg-white dark:bg-[#191b23] hover:border-[#a855f7]/50 transition-colors flex items-center gap-3"
    >
      <div className="shrink-0 w-9 h-9 rounded-full bg-[#a855f7]/10 text-[#a855f7] dark:text-[#ddb7ff] font-semibold flex items-center justify-center text-sm tabular-nums">
        {lesson.lesson_idx + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="text-sm font-semibold text-[#191c1e] dark:text-white truncate">
            {lesson.title}
          </h3>
          {done && (
            <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
          )}
          {started && (
            <Circle size={12} className="shrink-0 text-amber-500 fill-current" />
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-[#727785] dark:text-[#8c909f]">
          <Clock size={11} />
          <span>{lesson.est_minutes} min read</span>
          {done && <span>· Completed</span>}
          {started && <span>· In progress</span>}
        </div>
      </div>
      <ChevronRight size={16} className="shrink-0 text-[#727785] dark:text-[#8c909f]" />
    </button>
  );
}
