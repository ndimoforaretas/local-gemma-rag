/**
 * Recap quiz shown after every lesson in a workshop is complete.
 *
 * Pre-fills scope + difficulty from the workshop, kicks off generation
 * immediately, then reuses the existing QuizPlayerPanel / QuizResultsPanel
 * components so the experience matches standalone Quiz Mode exactly.
 */

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import { QuizGeneratingCard } from "../quiz/QuizGeneratingCard";
import { QuizPlayerPanel } from "../quiz/QuizPlayerPanel";
import { QuizResultsPanel } from "../quiz/QuizResultsPanel";
import type { QuizQuestion } from "../quiz/types";
import type { Workshop } from "./types";

type Phase = "generating" | "playing" | "results";

export function WorkshopFinalQuiz({
  workshop,
  onBack,
}: {
  workshop: Workshop;
  onBack: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("generating");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [newlyEarned, setNewlyEarned] = useState<string[]>([]);

  const generate = useMutation({ mutationFn: api.generateQuiz });
  const submit = useMutation({ mutationFn: api.submitQuiz });

  // Kick off generation immediately on mount, exactly once.
  useEffect(() => {
    generate.mutate(
      {
        difficulty: workshop.difficulty,
        num_questions: 5,
        question_types: ["mcq", "true_false"],
        document_filter: workshop.scope,
      },
      {
        onSuccess: (data) => {
          setQuestions(data.questions);
          setAnswers(new Array(data.questions.length).fill(null));
          setPhase("playing");
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitAnswer = () => {
    if (selected === null || revealed) return;
    if (selected === questions[current].correct_index) setCorrectCount((c) => c + 1);
    setAnswers((prev) => {
      const next = [...prev];
      next[current] = selected;
      return next;
    });
    setRevealed(true);
  };

  const nextQuestion = () => {
    if (current + 1 < questions.length) {
      setCurrent((c) => c + 1);
      setSelected(null);
      setRevealed(false);
    } else {
      setPhase("results");
      submit.mutate(
        {
          difficulty: workshop.difficulty,
          num_questions: questions.length,
          correct_count: correctCount,
          scope_used: workshop.scope,
        },
        {
          onSuccess: (d) => {
            setFinalScore(d.score_pct);
            setNewlyEarned(d.newly_earned_achievements);
          },
        },
      );
    }
  };

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink-strong"
      >
        <ArrowLeft size={14} /> Back to workshop outline
      </button>

      {phase === "generating" && <QuizGeneratingCard />}

      {phase === "playing" && questions.length > 0 && (
        <QuizPlayerPanel
          question={questions[current]}
          current={current}
          total={questions.length}
          selected={selected}
          revealed={revealed}
          onPick={(i) => !revealed && setSelected(i)}
          onSubmit={submitAnswer}
          onNext={nextQuestion}
        />
      )}

      {phase === "results" && (
        <QuizResultsPanel
          questions={questions}
          answers={answers}
          correctCount={correctCount}
          finalScore={finalScore}
          newlyEarned={newlyEarned}
          onRetry={onBack}
          onExit={onBack}
        />
      )}
    </div>
  );
}
