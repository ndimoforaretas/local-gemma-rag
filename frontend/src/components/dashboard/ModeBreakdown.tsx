/**
 * Per-mode Study Hub activity — four cards summarising what the user has
 * created across Quizzes, Workshops, Flashcards, and Mindmaps. Surfaces the
 * Study Hub on the dashboard, which previously showed only chat/time stats.
 *
 * Hidden entirely until the user has generated at least one artefact.
 */

import { Layers } from "lucide-react";
import type { ModeBreakdown as ModeBreakdownData } from "../../types/api";
import { SectionHeading } from "./SectionHeading";

export function ModeBreakdown({ data }: { data: ModeBreakdownData }) {
  const cards = [
    {
      icon: "🧠",
      label: "Quizzes",
      primary: data.quizzes.count,
      detail: data.quizzes.count > 0 ? `avg ${data.quizzes.avg_score}%` : "none yet",
    },
    {
      icon: "📋",
      label: "Workshops",
      primary: data.workshops.created,
      detail: `${data.workshops.completed} completed`,
    },
    {
      icon: "🃏",
      label: "Flashcards",
      primary: data.flashcards.decks,
      detail: `${data.flashcards.mastered} mastered`,
    },
    {
      icon: "🗺️",
      label: "Mindmaps",
      primary: data.mindmaps.created,
      detail: `${data.mindmaps.exports} exports`,
    },
  ];

  const totalCreated =
    data.quizzes.count +
    data.workshops.created +
    data.flashcards.decks +
    data.mindmaps.created;
  if (totalCreated <= 0) return null;

  return (
    <section>
      <SectionHeading icon={Layers} title="Study Hub activity" />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="p-5 rounded-2xl border border-[#c2c6d6] dark:border-[#424754] bg-white dark:bg-[#191b23]"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{c.icon}</span>
              <span className="text-sm font-medium text-ink-muted">
                {c.label}
              </span>
            </div>
            <div className="text-2xl font-bold text-ink-strong tabular-nums">
              {c.primary}
            </div>
            <div className="text-xs text-ink-faint mt-1">{c.detail}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
