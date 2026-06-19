/**
 * Quiz configuration screen — scope, difficulty, count, types, Start button.
 *
 * Stateless; the parent owns values and the mutation lifecycle.
 * Layout sub-pieces (form card, footer) live in their own tiny files so
 * this orchestrator file stays small.
 */

import { useTranslation } from "react-i18next";
import { Brain, Loader2, AlertCircle } from "lucide-react";
import { DocScopeFilter } from "../../DocScopeFilter";
import { PillButton, Section } from "./QuizPrimitives";
import { ConfigHeader } from "./ConfigHeader";
import {
  COUNTS,
  DIFFICULTIES,
  TIME_LIMITS,
  type Difficulty,
  type QuestionCount,
  type QuestionType,
  type QuizStyle,
  type TimeLimit,
} from "./types";

export interface QuizConfigPanelProps {
  scope: string[];
  setScope: (s: string[]) => void;
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  count: QuestionCount;
  setCount: (n: QuestionCount) => void;
  types: QuestionType[];
  toggleType: (t: QuestionType) => void;
  timeLimit: TimeLimit;
  setTimeLimit: (t: TimeLimit) => void;
  style: QuizStyle;
  setStyle: (s: QuizStyle) => void;
  onStart: () => void;
  isLoading: boolean;
  error: string | null;
}

export function QuizConfigPanel(p: QuizConfigPanelProps) {
  const { t } = useTranslation("study");
  const hasScope = p.scope.length > 0;
  const canStart = hasScope && p.types.length > 0 && !p.isLoading;
  return (
    <>
      <ConfigHeader />

      <div className="bg-white dark:bg-[#191b23] border border-[#c2c6d6] dark:border-[#424754] rounded-2xl p-6 sm:p-8 space-y-7">
        <Section
          label={t("quiz.config.scopeLabel")}
          hint={hasScope ? t("quiz.config.scopeHintHas") : t("quiz.config.scopeHintEmpty")}
        >
          <DocScopeFilter selected={p.scope} onChange={p.setScope} />
        </Section>

        <Section label={t("quiz.config.difficultyLabel")}>
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

        <Section label={t("quiz.config.countLabel")}>
          <div className="flex flex-wrap gap-2.5">
            {COUNTS.map((n) => (
              <PillButton
                key={n}
                active={p.count === n}
                onClick={() => p.setCount(n)}
              >
                {t("quiz.config.questionsN", { count: n })}
              </PillButton>
            ))}
          </div>
        </Section>

        <Section
          label={t("quiz.config.modeLabel")}
          hint={p.style === "exam" ? t("quiz.config.modeHintExam") : t("quiz.config.modeHintPractice")}
        >
          <div className="flex flex-wrap gap-2.5">
            <PillButton
              active={p.style === "practice"}
              onClick={() => p.setStyle("practice")}
            >
              {t("quiz.config.practice")}
            </PillButton>
            <PillButton
              active={p.style === "exam"}
              onClick={() => p.setStyle("exam")}
            >
              {t("quiz.config.exam")}
            </PillButton>
          </div>
        </Section>

        <Section label={t("quiz.config.timeLabel")} hint={t("quiz.config.timeHint")}>
          <div className="flex flex-wrap gap-2.5">
            {TIME_LIMITS.map((m) => (
              <PillButton
                key={m}
                active={p.timeLimit === m}
                onClick={() => p.setTimeLimit(m)}
              >
                {m === 0 ? t("quiz.config.noLimit") : t("quiz.config.minutes", { count: m })}
              </PillButton>
            ))}
          </div>
        </Section>

        <Section
          label={t("quiz.config.typesLabel")}
          hint={p.types.length === 0 ? t("quiz.config.typesHint") : undefined}
        >
          <div className="flex flex-wrap gap-2.5">
            <PillButton
              active={p.types.includes("mcq")}
              onClick={() => p.toggleType("mcq")}
            >
              {t("quiz.config.mcq")}
            </PillButton>
            <PillButton
              active={p.types.includes("true_false")}
              onClick={() => p.toggleType("true_false")}
            >
              {t("quiz.config.trueFalse")}
            </PillButton>
          </div>
        </Section>

        {p.error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{p.error}</span>
          </div>
        )}
      </div>

      {/* Footer action — content-width, right-aligned */}
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={p.onStart}
          disabled={!canStart}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#a855f7] hover:bg-[#9333ea] disabled:bg-[#a855f7]/40 disabled:cursor-not-allowed text-white font-semibold shadow-lg shadow-[#a855f7]/20 transition-colors"
        >
          {p.isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> {t("quiz.config.generating")}
            </>
          ) : (
            <>
              <Brain size={16} /> {t("quiz.config.start")}
            </>
          )}
        </button>
      </div>
    </>
  );
}
