import { motion, useReducedMotion } from "framer-motion";

/** Bouncing three-dot animation shown while the AI response is loading. */
export function TypingIndicator() {
  const prefersReducedMotion = useReducedMotion();
  const dots = [0, 0.1, 0.2];
  return (
    <div className="flex items-center gap-2 min-h-6" aria-live="polite">
      {dots.map((delay, i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-[#a855f7]"
          animate={prefersReducedMotion ? undefined : { y: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 0.6, delay }}
        />
      ))}
      <span className="text-sm text-[#727785] dark:text-[#8c909f]">
        Generating answer...
      </span>
    </div>
  );
}
