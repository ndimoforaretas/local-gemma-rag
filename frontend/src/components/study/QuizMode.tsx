/**
 * QuizMode — orchestrates the three-phase quiz flow.
 *
 * All state and mutations live in the `useQuiz` hook so this file is
 * just layout: top bar, then one of four panels based on phase + loading.
 */

import { Brain } from "lucide-react";
import { BackToHubButton } from "./StudyHub";
import { QuizConfigPanel } from "./quiz/QuizConfigPanel";
import { QuizGeneratingCard } from "./quiz/QuizGeneratingCard";
import { QuizPlayerPanel } from "./quiz/QuizPlayerPanel";
import { QuizResultsPanel } from "./quiz/QuizResultsPanel";
import { ResumeQuizBanner } from "./quiz/ResumeQuizBanner";
import { useQuiz } from "./quiz/useQuiz";

export function QuizMode({ onExit }: { onExit: () => void }) {
  const q = useQuiz();

  return (
    <div className="h-full overflow-y-auto">
      {/*
        min-h-full + flex column lets the content area use `my-auto` to claim
        the remaining vertical space evenly. The top bar stays at the top via
        normal document flow; long content (e.g. results recap) still scrolls.
      */}
      <div className="max-w-4xl mx-auto w-full px-6 sm:px-8 py-8 min-h-full flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <BackToHubButton onClick={onExit} />
          <div className="flex items-center gap-2">
            <Brain className="text-[#a855f7]" size={20} />
            <span className="text-sm font-semibold text-[#191c1e] dark:text-[#e1e2ec]">
              Quiz Mode
            </span>
          </div>
        </div>

        <div className="my-auto w-full">

        {q.phase === "config" && q.generate.isPending && <QuizGeneratingCard />}

        {q.phase === "config" && !q.generate.isPending && q.savedQuiz && (
          <ResumeQuizBanner
            savedQuiz={q.savedQuiz}
            onResume={q.resumeFromSaved}
            onDiscard={q.discardSaved}
          />
        )}

        {q.phase === "config" && !q.generate.isPending && (
          <QuizConfigPanel
            scope={q.scope}
            setScope={q.setScope}
            difficulty={q.difficulty}
            setDifficulty={q.setDifficulty}
            count={q.count}
            setCount={q.setCount}
            types={q.types}
            toggleType={q.toggleType}
            onStart={q.startQuiz}
            isLoading={false}
            error={q.generate.error?.message ?? null}
          />
        )}

        {q.phase === "playing" && q.questions.length > 0 && (
          <QuizPlayerPanel
            question={q.questions[q.current]}
            current={q.current}
            total={q.questions.length}
            selected={q.selected}
            revealed={q.revealed}
            onPick={q.pickOption}
            onSubmit={q.submitAnswer}
            onNext={q.nextQuestion}
          />
        )}

        {q.phase === "results" && (
          <QuizResultsPanel
            questions={q.questions}
            answers={q.answers}
            correctCount={q.correctCount}
            finalScore={q.finalScore}
            newlyEarned={q.newlyEarned}
            onRetry={q.restart}
            onExit={onExit}
          />
        )}
        </div>
      </div>
    </div>
  );
}
