/**
 * Loading card for outline + lesson generation.
 *
 * Same rotating-status pattern as QuizGeneratingCard, with copy and a slightly
 * different icon depending on which phase is generating.
 */

import { useEffect, useState } from "react";
import { BookOpen, FileText } from "lucide-react";
import { motion } from "framer-motion";

const OUTLINE_STAGES = [
  { from: 0, message: "Scanning your documents…" },
  { from: 3, message: "Identifying the core concepts…" },
  { from: 8, message: "Structuring the learning path…" },
  { from: 16, message: "Drafting lesson titles and reading-time estimates…" },
  { from: 30, message: "Almost there — finalising the outline…" },
];

const LESSON_STAGES = [
  { from: 0, message: "Re-reading the relevant material…" },
  { from: 4, message: "Outlining the lesson sections…" },
  { from: 10, message: "Writing the body, examples, and code blocks…" },
  { from: 22, message: "Polishing structure and self-check prompts…" },
  { from: 40, message: "Just finishing up — almost ready…" },
];

function pickStage(elapsed: number, stages: typeof OUTLINE_STAGES): string {
  let current = stages[0].message;
  for (const s of stages) if (elapsed >= s.from) current = s.message;
  return current;
}

export function WorkshopGeneratingCard({
  mode,
}: {
  mode: "outline" | "lesson";
}) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 250);
    return () => clearInterval(id);
  }, []);

  const Icon = mode === "outline" ? BookOpen : FileText;
  const stages = mode === "outline" ? OUTLINE_STAGES : LESSON_STAGES;
  const status = pickStage(elapsed, stages);
  const title = mode === "outline" ? "Building your workshop outline" : "Writing this lesson";
  const eta = mode === "outline" ? "10–40 seconds" : "20–60 seconds";

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timer = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  return (
    <div className="bg-white dark:bg-[#191b23] border border-[#c2c6d6] dark:border-[#424754] rounded-2xl p-8 sm:p-10 flex flex-col items-center text-center">
      <motion.div
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        className="w-16 h-16 rounded-2xl bg-[#a855f7]/15 text-[#a855f7] flex items-center justify-center mb-5"
      >
        <Icon size={32} />
      </motion.div>
      <h2 className="text-xl font-bold text-ink-strong mb-1">
        {title}
      </h2>
      <p className="text-sm text-ink-muted mb-6">
        Gemma is on it. This usually takes {eta}.
      </p>

      <div className="w-full max-w-sm h-1.5 bg-[#c2c6d6]/40 dark:bg-[#424754]/40 rounded-full overflow-hidden mb-4">
        <motion.div
          className="h-full bg-[#a855f7]"
          initial={{ x: "-100%" }}
          animate={{ x: "300%" }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
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
        {timer} elapsed
      </div>
    </div>
  );
}
