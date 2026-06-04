/**
 * Config form for a new flashcard deck. Mirrors the Workshop/Quiz layout.
 */

import { useTranslation } from "react-i18next";
import { Layers, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { DocScopeFilter } from "../../DocScopeFilter";
import { PillButton, Section } from "../quiz/QuizPrimitives";
import { DIFFICULTIES } from "../quiz/types";
import { CARD_COUNTS, type CardCount, type Difficulty } from "./types";

export interface FlashcardsConfigPanelProps {
  scope: string[];
  setScope: (s: string[]) => void;
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  cardCount: CardCount;
  setCardCount: (n: CardCount) => void;
  onStart: () => void;
  onCancel: () => void;
  isLoading: boolean;
  error: string | null;
}

export function FlashcardsConfigPanel(p: FlashcardsConfigPanelProps) {
  const { t } = useTranslation("study");
  const hasScope = p.scope.length > 0;
  const canStart = hasScope && !p.isLoading;

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={p.onCancel}
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink-strong"
      >
        <ArrowLeft size={14} />
        {t("flashcards.config.back")}
      </button>

      <div>
        <h2 className="text-2xl font-bold text-ink-strong mb-1">
          {t("flashcards.config.title")}
        </h2>
        <p className="text-sm text-ink-muted">{t("flashcards.config.subtitle")}</p>
      </div>

      <div className="bg-white dark:bg-[#191b23] border border-[#c2c6d6] dark:border-[#424754] rounded-2xl p-6 sm:p-8 space-y-7">
        <Section
          label={t("flashcards.config.scopeLabel")}
          hint={hasScope ? t("flashcards.config.scopeHintHas") : t("flashcards.config.scopeHintEmpty")}
        >
          <DocScopeFilter selected={p.scope} onChange={p.setScope} />
        </Section>

        <Section label={t("flashcards.config.difficultyLabel")}>
          <div className="flex flex-wrap gap-2.5">
            {DIFFICULTIES.map((d) => (
              <PillButton
                key={d.id}
                active={p.difficulty === d.id}
                onClick={() => p.setDifficulty(d.id)}
              >
                <span className={d.tone}>●</span> {t(`difficulty.${d.id}`)}
              </PillButton>
            ))}
          </div>
        </Section>

        <Section label={t("flashcards.config.countLabel")}>
          <div className="flex flex-wrap gap-2.5">
            {CARD_COUNTS.map((n) => (
              <PillButton key={n} active={p.cardCount === n} onClick={() => p.setCardCount(n)}>
                {t("flashcards.config.cardsN", { count: n })}
              </PillButton>
            ))}
          </div>
        </Section>

        {p.error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{p.error}</span>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={p.onStart}
          disabled={!canStart}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#a855f7] hover:bg-[#9333ea] disabled:bg-[#a855f7]/40 disabled:cursor-not-allowed text-white font-semibold shadow-lg shadow-[#a855f7]/20 transition-colors"
        >
          {p.isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> {t("flashcards.config.generating")}
            </>
          ) : (
            <>
              <Layers size={16} /> {t("flashcards.config.build")}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
