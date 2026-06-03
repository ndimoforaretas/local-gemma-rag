/**
 * State + mutation logic for the Quiz Mode flow.
 *
 * Extracting this into a hook keeps QuizMode.tsx focused on layout, and lets
 * us unit-test the state machine independently if we ever need to.
 */

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import type {
  Difficulty,
  QuestionCount,
  QuestionType,
  QuizPhase,
  QuizQuestion,
  TimeLimit,
} from "./types";
import { useQuizPersistence } from "./useQuizPersistence";

export function useQuiz() {
  const qc = useQueryClient();

  // ── Config ───────────────────────────────────────────────────────────
  const [scope, setScope] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [count, setCount] = useState<QuestionCount>(5);
  const [types, setTypes] = useState<QuestionType[]>(["mcq", "true_false"]);
  const [timeLimit, setTimeLimit] = useState<TimeLimit>(0); // minutes; 0 = none

  // ── Timer ────────────────────────────────────────────────────────────
  // Absolute deadline (ms epoch) for a timed quiz, and the live remaining ms.
  const [deadline, setDeadline] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  // ── Playing ──────────────────────────────────────────────────────────
  // Landing on the library (saved quizzes) view.
  const [phase, setPhase] = useState<QuizPhase>("library");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  // id of the saved quiz currently being played (for server-side resume).
  const [activeQuizId, setActiveQuizId] = useState<number | null>(null);

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
    // Mirror to the server so this quiz can be resumed later from the library
    // (survives restarts / other devices). Best-effort; never blocks the quiz.
    if (activeQuizId != null) {
      api
        .saveQuizProgress(activeQuizId, { current, correct_count: correctCount, answers })
        .catch(() => undefined);
    }
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

  // ── Saved-quiz library ───────────────────────────────────────────────
  const savedList = useQuery({
    queryKey: ["quizzes", "list"],
    queryFn: () => api.listSavedQuizzes(),
    // Always pull fresh progress when the library is shown again (the count
    // could have changed in another mount of the player).
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Mirror the latest play state into a ref so the unmount-flush below always
  // saves the freshest progress — even if the user navigates away (which
  // unmounts the whole mode) right after answering, before the per-change
  // save settles.
  const latest = useRef({
    activeQuizId,
    current,
    correctCount,
    answers,
    phase,
  });
  latest.current = { activeQuizId, current, correctCount, answers, phase };

  useEffect(() => {
    // Unmount only: persist the in-progress attempt one last time.
    return () => {
      const l = latest.current;
      if (l.phase === "playing" && l.activeQuizId != null) {
        api
          .saveQuizProgress(l.activeQuizId, {
            current: l.current,
            correct_count: l.correctCount,
            answers: l.answers,
          })
          .catch(() => undefined);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetPlayer = (qs: QuizQuestion[]) => {
    setQuestions(qs);
    setCurrent(0);
    setSelected(null);
    setRevealed(false);
    setCorrectCount(0);
    setAnswers(new Array(qs.length).fill(null));
    setPhase("playing");
  };

  const generate = useMutation({
    mutationFn: api.generateQuiz,
    onSuccess: (data) => {
      setActiveQuizId(data.quiz_id || null);
      resetPlayer(data.questions);
      // Start the countdown if the user picked a time limit (timed practice).
      setDeadline(timeLimit > 0 ? Date.now() + timeLimit * 60_000 : null);
      // A new quiz was auto-saved server-side; refresh the library.
      qc.invalidateQueries({ queryKey: ["quizzes", "list"] });
    },
  });

  // Open a saved quiz — resume from saved progress if any, else start fresh.
  const loadSaved = useMutation({
    mutationFn: api.getSavedQuiz,
    onSuccess: (quiz) => {
      setScope(quiz.scope);
      setDifficulty(quiz.difficulty);
      setActiveQuizId(quiz.id);

      const p = quiz.progress;
      const total = quiz.questions.length;
      const allAnswered =
        !!p && p.answers.length === total && p.answers.every((a) => a !== null);

      if (p && p.completed) {
        // Already finished → show the saved result (revisitable, no re-record).
        setQuestions(quiz.questions);
        setAnswers(p.answers);
        setCorrectCount(p.correct_count);
        setFinalScore(p.score_pct ?? null);
        setNewlyEarned([]);
        setSelected(null);
        setRevealed(false);
        setPhase("results");
      } else if (p && allAnswered) {
        // All answered but never finalised → finish now: persist the completed
        // result (so it stays revisitable) and record the attempt once.
        const scorePct = total ? Math.round((100 * p.correct_count) / total) : 0;
        setQuestions(quiz.questions);
        setAnswers(p.answers);
        setCorrectCount(p.correct_count);
        setFinalScore(null);
        setNewlyEarned([]);
        setSelected(null);
        setRevealed(false);
        clearPersisted();
        api
          .saveQuizProgress(quiz.id, {
            current: p.current,
            correct_count: p.correct_count,
            answers: p.answers,
            completed: true,
            score_pct: scorePct,
          })
          .catch(() => undefined);
        qc.invalidateQueries({ queryKey: ["quizzes", "list"] });
        setPhase("results");
        submit.mutate({
          difficulty: quiz.difficulty,
          num_questions: total,
          correct_count: p.correct_count,
          scope_used: quiz.scope.length > 0 ? quiz.scope : undefined,
        });
      } else if (p) {
        // Resume mid-quiz from the saved position.
        setQuestions(quiz.questions);
        setCurrent(p.current);
        setCorrectCount(p.correct_count);
        setAnswers(p.answers);
        const answeredHere = p.answers[p.current] ?? null;
        setSelected(answeredHere);
        setRevealed(answeredHere !== null);
        setPhase("playing");
      } else {
        resetPlayer(quiz.questions);
      }
    },
  });

  const deleteSaved = useMutation({
    mutationFn: api.deleteSavedQuiz,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quizzes", "list"] }),
  });

  const submit = useMutation({
    mutationFn: api.submitQuiz,
    onSuccess: (data) => {
      setFinalScore(data.score_pct);
      setNewlyEarned(data.newly_earned_achievements);
    },
  });

  // Finish the current attempt: persist a completed result + record the score.
  // Shared by the normal "Next on the last question" path and timer expiry.
  const finishQuiz = () => {
    const total = questions.length;
    const scorePct = total ? Math.round((100 * correctCount) / total) : 0;
    clearPersisted();
    setDeadline(null);
    setRemainingMs(null);
    if (activeQuizId != null) {
      api
        .saveQuizProgress(activeQuizId, {
          current,
          correct_count: correctCount,
          answers,
          completed: true,
          score_pct: scorePct,
        })
        .catch(() => undefined);
      qc.invalidateQueries({ queryKey: ["quizzes", "list"] });
    }
    setPhase("results");
    submit.mutate({
      difficulty,
      num_questions: total,
      correct_count: correctCount,
      scope_used: scope.length > 0 ? scope : undefined,
    });
  };

  // Tick the countdown once per second while a timed quiz is in play.
  useEffect(() => {
    if (phase !== "playing" || deadline == null) {
      setRemainingMs(null);
      return;
    }
    const tick = () => setRemainingMs(Math.max(0, deadline - Date.now()));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [phase, deadline]);

  // Time's up → auto-submit whatever has been answered.
  useEffect(() => {
    if (phase === "playing" && deadline != null && remainingMs === 0) {
      finishQuiz();
    }
    // finishQuiz reads current state; we intentionally key on remainingMs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingMs, phase, deadline]);

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
      finishQuiz();
    }
  };

  const resetPlayState = () => {
    clearPersisted();
    setActiveQuizId(null);
    setQuestions([]);
    setSelected(null);
    setRevealed(false);
    setCorrectCount(0);
    setAnswers([]);
    setFinalScore(null);
    setNewlyEarned([]);
    setDeadline(null);
    setRemainingMs(null);
    generate.reset();
    submit.reset();
  };

  // "Retry" from the results screen. With a saved quiz active, retake the SAME
  // quiz from scratch (clearing its completed result); otherwise → config form.
  const restart = () => {
    if (activeQuizId != null && questions.length > 0) {
      const qs = questions;
      const id = activeQuizId;
      clearPersisted();
      submit.reset();
      setFinalScore(null);
      setNewlyEarned([]);
      api.clearQuizProgress(id).catch(() => undefined);
      qc.invalidateQueries({ queryKey: ["quizzes", "list"] });
      setDeadline(null); // retakes of saved quizzes are untimed
      setRemainingMs(null);
      resetPlayer(qs); // replay the same questions from Q1
    } else {
      resetPlayState();
      setPhase("config");
    }
  };

  // Open the new-quiz config form from the library.
  const startNew = () => {
    resetPlayState();
    setPhase("config");
  };

  // Back to the saved-quiz library (refresh the list).
  const backToLibrary = () => {
    resetPlayState();
    setPhase("library");
    qc.invalidateQueries({ queryKey: ["quizzes", "list"] });
  };

  return {
    scope, setScope,
    difficulty, setDifficulty,
    count, setCount,
    types, toggleType,
    timeLimit, setTimeLimit,
    remainingMs,
    phase, questions, current, selected, revealed, correctCount, answers,
    finalScore, newlyEarned,
    generate, submit,
    startQuiz, pickOption, submitAnswer, nextQuestion, restart,
    // Library (saved quizzes)
    savedList, loadSaved, deleteSaved, startNew, backToLibrary,
    // Persistence
    savedQuiz, resumeFromSaved, discardSaved: clearPersisted,
  };
}
