import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface ThinkingPanelProps {
  thinking: string;
  /** True while the stream is still writing thinking tokens. */
  isStreaming?: boolean;
}

export function ThinkingPanel({ thinking, isStreaming = false }: ThinkingPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="w-full mb-1">
      <button
        onClick={() => setIsOpen((p) => !p)}
        aria-expanded={isOpen}
        className="flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink-strong transition-colors select-none group"
      >
        <span className="text-[13px]">🧠</span>
        <span>Reasoning</span>
        {isStreaming && (
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#a855f7] animate-pulse ml-0.5" />
        )}
        <ChevronDown
          size={13}
          className={`transition-transform duration-200 ${isOpen ? "rotate-180" : "rotate-0"} text-ink-faint`}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="thinking-panel"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, height: "auto" }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-3 rounded-xl bg-[#f5f0ff] dark:bg-[#1e1a2e] border border-[#d8b4fe] dark:border-[#4c1d95] text-xs text-[#6b21a8] dark:text-[#c4b5fd] font-mono leading-relaxed whitespace-pre-wrap break-words max-h-72 overflow-y-auto">
              {thinking}
              {isStreaming && (
                <span className="inline-block w-1.5 h-3 bg-[#a855f7] animate-pulse ml-0.5 align-middle" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
