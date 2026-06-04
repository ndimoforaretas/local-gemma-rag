/**
 * Loading card for outline + lesson generation.
 *
 * Same rotating-status pattern as QuizGeneratingCard, with copy and a slightly
 * different icon depending on which phase is generating.
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, FileText } from "lucide-react";
import { motion } from "framer-motion";

const OUTLINE_STAGES = [
  { from: 0, key: "outlineStage0" },
  { from: 3, key: "outlineStage1" },
  { from: 8, key: "outlineStage2" },
  { from: 16, key: "outlineStage3" },
  { from: 30, key: "outlineStage4" },
];

const LESSON_STAGES = [
  { from: 0, key: "lessonStage0" },
  { from: 4, key: "lessonStage1" },
  { from: 10, key: "lessonStage2" },
  { from: 22, key: "lessonStage3" },
  { from: 40, key: "lessonStage4" },
];

function pickStageKey(elapsed: number, stages: typeof OUTLINE_STAGES): string {
  let current = stages[0].key;
  for (const s of stages) if (elapsed >= s.from) current = s.key;
  return current;
}

export function WorkshopGeneratingCard({
  mode,
}: {
  mode: "outline" | "lesson";
}) {
  const { t } = useTranslation("study");
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 250);
    return () => clearInterval(id);
  }, []);

  const Icon = mode === "outline" ? BookOpen : FileText;
  const stages = mode === "outline" ? OUTLINE_STAGES : LESSON_STAGES;
  const status = t(`workshop.gen.${pickStageKey(elapsed, stages)}`);
  const title = mode === "outline" ? t("workshop.gen.outlineTitle") : t("workshop.gen.lessonTitle");
  const eta = mode === "outline" ? t("workshop.gen.outlineEta") : t("workshop.gen.lessonEta");

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
        {t("workshop.gen.body", { eta })}
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
        {t("workshop.gen.elapsed", { time: timer })}
      </div>
    </div>
  );
}
