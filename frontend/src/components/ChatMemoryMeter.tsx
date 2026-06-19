/**
 * ChatMemoryMeter — a slim "working memory" gauge for the active chat.
 *
 * The AI only keeps a rolling window of the conversation in context (older
 * turns drop out once a budget is hit). This shows how full that window is so
 * the user is never surprised when the assistant "forgets" earlier messages.
 */

import { useTranslation } from "react-i18next";
import { Brain, AlertTriangle } from "lucide-react";
import type { MemoryPayload } from "./knowledgeBase/ragStream";

export function ChatMemoryMeter({ memory }: { memory?: MemoryPayload }) {
  const { t } = useTranslation("chat");
  if (!memory || memory.budget_chars <= 0) return null;

  const pct = Math.min(
    100,
    Math.round((memory.used_chars / memory.budget_chars) * 100),
  );
  const trimmed = memory.trimmed || pct >= 100;

  // Colour ramp: calm → caution → full.
  const tone = trimmed
    ? { bar: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" }
    : pct >= 75
      ? { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" }
      : { bar: "bg-emerald-500", text: "text-ink-muted" };

  // Rough word estimate (~4 chars/word) for a human-readable tooltip.
  const approxWords = Math.round(memory.used_chars / 4 / 100) * 100;

  return (
    <div className="flex flex-col gap-1">
      <div
        className="flex items-center gap-2"
        title={t("memory.tooltip", { words: approxWords.toLocaleString(), pct })}
      >
        <Brain size={12} className={`shrink-0 ${tone.text}`} />
        <span className={`text-[11px] font-medium shrink-0 ${tone.text}`}>
          {t("memory.label")}
        </span>
        <div className="flex-1 h-1.5 rounded-full bg-[#c2c6d6]/40 dark:bg-[#424754]/40 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${tone.bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`text-[11px] tabular-nums shrink-0 ${tone.text}`}>
          {pct}%
        </span>
      </div>

      {trimmed && (
        <div className="flex items-start gap-1.5 text-[11px] text-rose-600 dark:text-rose-400">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          <span>{t("memory.trimmed")}</span>
        </div>
      )}
    </div>
  );
}
