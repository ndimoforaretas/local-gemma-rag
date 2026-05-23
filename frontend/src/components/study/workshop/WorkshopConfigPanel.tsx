/**
 * Config form for a new workshop. Scope mandatory; difficulty + lesson count
 * picker. Pattern mirrors QuizConfigPanel for visual consistency.
 */

import { BookOpen, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { DocScopeFilter } from "../../DocScopeFilter";
import { PillButton, Section } from "../quiz/QuizPrimitives";
import { DIFFICULTIES } from "../quiz/types";
import { LESSON_COUNTS, type LessonCount, type WorkshopDifficulty } from "./types";

export interface WorkshopConfigPanelProps {
  scope: string[];
  setScope: (s: string[]) => void;
  difficulty: WorkshopDifficulty;
  setDifficulty: (d: WorkshopDifficulty) => void;
  lessonCount: LessonCount;
  setLessonCount: (n: LessonCount) => void;
  onStart: () => void;
  onCancel: () => void;
  isLoading: boolean;
  error: string | null;
}

export function WorkshopConfigPanel(p: WorkshopConfigPanelProps) {
  const hasScope = p.scope.length > 0;
  const canStart = hasScope && !p.isLoading;

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={p.onCancel}
        className="inline-flex items-center gap-1.5 text-sm text-[#424754] dark:text-[#c2c6d6] hover:text-[#191c1e] dark:hover:text-white"
      >
        <ArrowLeft size={14} />
        Back to workshops
      </button>

      <div>
        <h2 className="text-2xl font-bold text-[#191c1e] dark:text-white mb-1">
          New Workshop
        </h2>
        <p className="text-sm text-[#424754] dark:text-[#c2c6d6]">
          Choose your scope, difficulty, and how many lessons to generate.
        </p>
      </div>

      <div className="bg-white dark:bg-[#191b23] border border-[#c2c6d6] dark:border-[#424754] rounded-2xl p-6 sm:p-8 space-y-7">
        <Section
          label="Document scope (required)"
          hint={
            hasScope
              ? "The workshop pulls all content from these documents."
              : "Pick at least one category or file. Wide scope = unfocused workshop."
          }
        >
          <DocScopeFilter selected={p.scope} onChange={p.setScope} />
        </Section>

        <Section label="Difficulty">
          <div className="flex flex-wrap gap-2.5">
            {DIFFICULTIES.map((d) => (
              <PillButton
                key={d.id}
                active={p.difficulty === d.id}
                onClick={() => p.setDifficulty(d.id)}
              >
                <span className={d.tone}>●</span> {d.label}
              </PillButton>
            ))}
          </div>
        </Section>

        <Section label="Number of lessons">
          <div className="flex flex-wrap gap-2.5">
            {LESSON_COUNTS.map((n) => (
              <PillButton
                key={n}
                active={p.lessonCount === n}
                onClick={() => p.setLessonCount(n)}
              >
                {n} lessons
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
              <Loader2 size={16} className="animate-spin" /> Building outline…
            </>
          ) : (
            <>
              <BookOpen size={16} /> Build Workshop
            </>
          )}
        </button>
      </div>
    </div>
  );
}
