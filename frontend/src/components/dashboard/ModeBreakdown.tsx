/**
 * Per-mode Study Hub activity — four cards summarising what the user has
 * created across Quizzes, Workshops, Flashcards, and Mindmaps. Surfaces the
 * Study Hub on the dashboard, which previously showed only chat/time stats.
 *
 * Hidden entirely until the user has generated at least one artefact.
 */

import { useTranslation } from "react-i18next";
import { Layers } from "lucide-react";
import type { ModeBreakdown as ModeBreakdownData } from "../../types/api";
import { SectionHeading } from "./SectionHeading";

export function ModeBreakdown({ data }: { data: ModeBreakdownData }) {
  const { t } = useTranslation("dashboard");
  const cards = [
    {
      icon: "🧠",
      label: t("breakdown.quizzes"),
      primary: data.quizzes.count,
      detail: data.quizzes.count > 0
        ? t("breakdown.avgScore", { score: data.quizzes.avg_score })
        : t("breakdown.noneYet"),
    },
    {
      icon: "📋",
      label: t("breakdown.workshops"),
      primary: data.workshops.created,
      detail: t("breakdown.completed", { count: data.workshops.completed }),
    },
    {
      icon: "🃏",
      label: t("breakdown.flashcards"),
      primary: data.flashcards.decks,
      detail: t("breakdown.mastered", { count: data.flashcards.mastered }),
    },
    {
      icon: "🗺️",
      label: t("breakdown.mindmaps"),
      primary: data.mindmaps.created,
      detail: t("breakdown.exports", { count: data.mindmaps.exports }),
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
      <SectionHeading icon={Layers} title={t("breakdown.title")} />

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
