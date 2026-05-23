/**
 * State + mutation logic for the Quiz Mode flow.
 *
 * Extracting this into a hook keeps QuizMode.tsx focused on layout, and lets
 * us unit-test the state machine independently if we ever need to.
 */

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import type {
  Difficulty,
  QuestionCount,
  QuestionType,
  QuizPhase,
  QuizQuestion,
} from "./types";
import { useQuizPersistence } from "./useQuizPersistence";

export function useQuiz() {
  // ── Config ───────────────────────────────────────────────────────────
  const [scope, setScope] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [count, setCount] = useState<QuestionCount>(5);
  const [types, setTypes] = useState<QuestionType[]>(["mcq", "true_false"]);

  // ── Playing ──────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<QuizPhase>("config");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);

  // ── Results ──────────────────────────────────────────────────────────
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [newlyEarned, setNewlyEarned] = useState<string[]>([]);

  // ── Persistence (localStorage) ───────────────────────────────────────
  const { savedQuiz, savePersisted, clearPersisted } = useQuizPersistence();

  // Save state on every playing-phase change so a refresh / browser close
  // can be recovered without losing the (expensive-to-generate) questions.
  useEffect(() => {
    if (phase !== "playing" || questions.length === 0) return;
    savePersisted({
      config: { difficulty, count, types, scope },
      questions,
      current,
      correctCount,
      answers,
    });
    // savePersisted is stable enough — no need to include in deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, questions, current, correctCount, answers]);

  const resumeFromSaved = () => {
    if (!savedQuiz) return;
    setDifficulty(savedQuiz.config.difficulty);
    setCount(savedQuiz.config.count);
    setTypes(savedQuiz.config.types);
    setScope(savedQuiz.config.scope);
    setQuestions(savedQuiz.questions);
    setCurrent(savedQuiz.current);
    setCorrectCount(savedQuiz.correctCount);
    setAnswers(savedQuiz.answers);
    // Transient view state is always reset so the user can re-pick if needed.
    setSelected(null);
    setRevealed(false);
    setPhase("playing");
  };

  const generate = useMutation({
    mutationFn: api.generateQuiz,
    onSuccess: (data) => {
      setQuestions(data.questions);
      setCurrent(0);
      setSelected(null);
      setRevealed(false);
      setCorrectCount(0);
      setAnswers(new Array(data.questions.length).fill(null));
      setPhase("playing");
    },
  });

  const submit = useMutation({
    mutationFn: api.submitQuiz,
    onSuccess: (data) => {
      setFinalScore(data.score_pct);
      setNewlyEarned(data.newly_earned_achievements);
    },
  });

  const toggleType = (t: QuestionType) =>
    setTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );

  const startQuiz = () => {
    if (types.length === 0) return;
    generate.mutate({
      difficulty,
      num_questions: count,
      question_types: types,
      document_filter: scope.length > 0 ? scope : undefined,
    });
  };

  const pickOption = (idx: number) => {
    if (!revealed) setSelected(idx);
  };

  const submitAnswer = () => {
    if (selected === null || revealed) return;
    if (selected === questions[current].correct_index) {
      setCorrectCount((c) => c + 1);
    }
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
      // Quiz finished — clear localStorage so it doesn't reappear next visit.
      clearPersisted();
      setPhase("results");
      submit.mutate({
        difficulty,
        num_questions: questions.length,
        correct_count: correctCount,
        scope_used: scope.length > 0 ? scope : undefined,
      });
    }
  };

  const restart = () => {
    clearPersisted();
    setPhase("config");
    setQuestions([]);
    setSelected(null);
    setRevealed(false);
    setCorrectCount(0);
    setAnswers([]);
    setFinalScore(null);
    setNewlyEarned([]);
    generate.reset();
    submit.reset();
  };

  return {
    scope, setScope,
    difficulty, setDifficulty,
    count, setCount,
    types, toggleType,
    phase, questions, current, selected, revealed, correctCount, answers,
    finalScore, newlyEarned,
    generate, submit,
    startQuiz, pickOption, submitAnswer, nextQuestion, restart,
    // Persistence
    savedQuiz, resumeFromSaved, discardSaved: clearPersisted,
  };
}
