/**
 * Quiz configuration screen — scope, difficulty, count, types, Start button.
 *
 * Stateless; the parent owns values and the mutation lifecycle.
 * Layout sub-pieces (form card, footer) live in their own tiny files so
 * this orchestrator file stays small.
 */

import { Brain, Loader2, AlertCircle } from "lucide-react";
import { DocScopeFilter } from "../../DocScopeFilter";
import { PillButton, Section } from "./QuizPrimitives";
import { ConfigHeader } from "./ConfigHeader";
import {
  COUNTS,
  DIFFICULTIES,
  type Difficulty,
  type QuestionCount,
  type QuestionType,
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
  onStart: () => void;
  isLoading: boolean;
  error: string | null;
}

export function QuizConfigPanel(p: QuizConfigPanelProps) {
  const canStart = p.types.length > 0 && !p.isLoading;
  return (
    <>
      <ConfigHeader />

      <div className="bg-white dark:bg-[#191b23] border border-[#c2c6d6] dark:border-[#424754] rounded-2xl p-6 sm:p-8 space-y-7">
        <Section
          label="Document scope"
          hint="Leave empty to draw from the whole knowledge base."
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

        <Section label="Number of questions">
          <div className="flex flex-wrap gap-2.5">
            {COUNTS.map((n) => (
              <PillButton
                key={n}
                active={p.count === n}
                onClick={() => p.setCount(n)}
              >
                {n} questions
              </PillButton>
            ))}
          </div>
        </Section>

        <Section
          label="Question types"
          hint={
            p.types.length === 0 ? "Pick at least one question type." : undefined
          }
        >
          <div className="flex flex-wrap gap-2.5">
            <PillButton
              active={p.types.includes("mcq")}
              onClick={() => p.toggleType("mcq")}
            >
              Multiple choice
            </PillButton>
            <PillButton
              active={p.types.includes("true_false")}
              onClick={() => p.toggleType("true_false")}
            >
              True / False
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
              <Loader2 size={16} className="animate-spin" /> Generating…
            </>
          ) : (
            <>
              <Brain size={16} /> Start Quiz
            </>
          )}
        </button>
      </div>
    </>
  );
}
