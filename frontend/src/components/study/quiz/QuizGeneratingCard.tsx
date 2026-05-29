/**
 * "Quiz is being generated" card — replaces the config panel during the
 * Ollama call so the user has something to watch beyond a spinner.
 *
 * - Pulsing brain icon
 * - Indeterminate progress bar
 * - Status messages that rotate based on elapsed seconds (gives a sense
 *   of "the AI is doing different stages of work" even though the call
 *   is a single blocking request)
 * - Elapsed timer for transparency
 */

import { useEffect, useState } from "react";
import { Brain } from "lucide-react";
import { motion } from "framer-motion";

const STATUS_STAGES: { from: number; message: string }[] = [
  { from: 0, message: "Scanning your documents…" },
  { from: 3, message: "Identifying key concepts…" },
  { from: 7, message: "Drafting questions…" },
  { from: 13, message: "Crafting plausible answer options…" },
  { from: 22, message: "Polishing wording and explanations…" },
  { from: 35, message: "Almost there — finalising your quiz…" },
];

function pickStage(elapsedSec: number): string {
  let current = STATUS_STAGES[0].message;
  for (const stage of STATUS_STAGES) {
    if (elapsedSec >= stage.from) current = stage.message;
  }
  return current;
}

export function QuizGeneratingCard() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, []);

  const status = pickStage(elapsed);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timerLabel = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  return (
    <div className="bg-white dark:bg-[#191b23] border border-[#c2c6d6] dark:border-[#424754] rounded-2xl p-8 sm:p-10 flex flex-col items-center text-center">
      <motion.div
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        className="w-16 h-16 rounded-2xl bg-[#a855f7]/15 text-[#a855f7] flex items-center justify-center mb-5"
      >
        <Brain size={32} />
      </motion.div>

      <h2 className="text-xl font-bold text-ink-strong mb-1">
        Generating your quiz
      </h2>
      <p className="text-sm text-ink-muted mb-6">
        Gemma is reading your selected documents and writing questions just for
        you. This usually takes 10–40 seconds.
      </p>

      {/* Indeterminate progress bar */}
      <div className="w-full max-w-sm h-1.5 bg-[#c2c6d6]/40 dark:bg-[#424754]/40 rounded-full overflow-hidden mb-4">
        <motion.div
          className="h-full bg-[#a855f7]"
          initial={{ x: "-100%" }}
          animate={{ x: "300%" }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ width: "40%" }}
        />
      </div>

      <motion.div
        key={status}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-sm font-medium text-[#a855f7] dark:text-[#ddb7ff] mb-2"
      >
        {status}
      </motion.div>
      <div className="text-xs text-ink-muted tabular-nums">
        {timerLabel} elapsed
      </div>
    </div>
  );
}
