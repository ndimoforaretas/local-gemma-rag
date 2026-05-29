/**
 * Loading card for mindmap generation — rotating-message pattern.
 */

import { useEffect, useState } from "react";
import { Network } from "lucide-react";
import { motion } from "framer-motion";

const STAGES = [
  { from: 0, message: "Reading your documents…" },
  { from: 3, message: "Identifying central themes…" },
  { from: 8, message: "Mapping sub-topics under each theme…" },
  { from: 18, message: "Laying out the radial structure…" },
  { from: 30, message: "Almost there — finalising your mindmap…" },
];

function stage(elapsed: number): string {
  let cur = STAGES[0].message;
  for (const s of STAGES) if (elapsed >= s.from) cur = s.message;
  return cur;
}

export function MindmapsGeneratingCard() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 250);
    return () => clearInterval(id);
  }, []);

  const status = stage(elapsed);
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
        <Network size={32} />
      </motion.div>
      <h2 className="text-xl font-bold text-ink-strong mb-1">
        Drawing your mindmap
      </h2>
      <p className="text-sm text-ink-muted mb-6">
        Gemma is reading your documents and structuring the concepts.
        This usually takes 15–40 seconds.
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
