import { useState, useRef, useEffect, useId } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

interface TooltipProps {
  content: string;
  position?: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
}

const positionClasses = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
};

const arrowClasses = {
  top: "top-full left-1/2 -translate-x-1/2 border-t-slate-800 border-l-transparent border-r-transparent border-b-transparent border-4",
  bottom:
    "bottom-full left-1/2 -translate-x-1/2 border-b-slate-800 border-l-transparent border-r-transparent border-t-transparent border-4",
  left: "left-full top-1/2 -translate-y-1/2 border-l-slate-800 border-t-transparent border-b-transparent border-r-transparent border-4",
  right:
    "right-full top-1/2 -translate-y-1/2 border-r-slate-800 border-t-transparent border-b-transparent border-l-transparent border-4",
};

export function Tooltip({ content, position = "top", children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useId();
  const prefersReducedMotion = useReducedMotion();

  const showTooltip = () => {
    timerRef.current = setTimeout(() => setVisible(true), 300);
  };

  const hideTooltip = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  useEffect(() => {
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        hideTooltip();
      }
    };

    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      aria-describedby={visible ? tooltipId : undefined}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}>
      {children}
      <AnimatePresence>
        {visible && (
          <motion.div
            id={tooltipId}
            role="tooltip"
            initial={
              prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }
            }
            animate={
              prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }
            }
            exit={
              prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }
            }
            transition={{ duration: prefersReducedMotion ? 0 : 0.12 }}
            className={`absolute z-50 pointer-events-none whitespace-nowrap ${positionClasses[position]}`}>
            <div className="bg-slate-800 dark:bg-slate-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-xl border border-slate-700 dark:border-slate-600">
              {content}
            </div>
            <div className={`absolute w-0 h-0 ${arrowClasses[position]}`} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
