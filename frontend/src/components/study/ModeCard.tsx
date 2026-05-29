/**
 * One clickable card on the Study Hub landing page.
 *
 * Stateless. Renders icon + label + description and either acts as a button
 * (when available) or shows a "Coming Soon" pill (when not).
 */

import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

export interface ModeCardProps {
  label: string;
  description: string;
  icon: LucideIcon;
  available: boolean;
  onClick: () => void;
}

export function ModeCard({
  label,
  description,
  icon: Icon,
  available,
  onClick,
}: ModeCardProps) {
  return (
    <motion.button
      type="button"
      onClick={() => available && onClick()}
      whileHover={available ? { y: -2 } : {}}
      whileTap={available ? { y: 0 } : {}}
      disabled={!available}
      aria-disabled={!available}
      className={`
        text-left p-6 rounded-2xl border transition-colors
        ${
          available
            ? "bg-white dark:bg-[#191b23] border-[#c2c6d6] dark:border-[#424754] hover:border-[#a855f7]/50 cursor-pointer"
            : "bg-[#f2f4f6] dark:bg-[#191b23]/50 border-[#c2c6d6]/40 dark:border-[#424754]/40 opacity-60 cursor-not-allowed"
        }
      `}
    >
      <div className="flex items-center gap-3.5 mb-3">
        <div
          className={`
            w-12 h-12 rounded-xl flex items-center justify-center shrink-0
            ${
              available
                ? "bg-[#a855f7]/15 text-[#a855f7]"
                : "bg-[#c2c6d6]/40 dark:bg-[#424754]/40 text-ink-faint"
            }
          `}
        >
          <Icon size={24} />
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-ink-strong leading-tight">
          {label}
        </h2>
        {!available && (
          <span className="ml-auto text-xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-[#c2c6d6]/40 dark:bg-[#424754]/40 text-ink-muted">
            Coming Soon
          </span>
        )}
      </div>
      <p className="text-sm text-ink-muted leading-relaxed">
        {description}
      </p>
    </motion.button>
  );
}
