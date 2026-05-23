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
        text-left p-5 rounded-2xl border transition-colors
        ${
          available
            ? "bg-white dark:bg-[#191b23] border-[#c2c6d6] dark:border-[#424754] hover:border-[#a855f7]/50 cursor-pointer"
            : "bg-[#f2f4f6] dark:bg-[#191b23]/50 border-[#c2c6d6]/40 dark:border-[#424754]/40 opacity-60 cursor-not-allowed"
        }
      `}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={`
            w-10 h-10 rounded-xl flex items-center justify-center
            ${
              available
                ? "bg-[#a855f7]/15 text-[#a855f7]"
                : "bg-[#c2c6d6]/40 dark:bg-[#424754]/40 text-[#727785] dark:text-[#8c909f]"
            }
          `}
        >
          <Icon size={20} />
        </div>
        {!available && (
          <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-[#c2c6d6]/40 dark:bg-[#424754]/40 text-[#727785] dark:text-[#8c909f]">
            Coming Soon
          </span>
        )}
      </div>
      <h2 className="text-base font-semibold mb-1 text-[#191c1e] dark:text-[#e1e2ec]">
        {label}
      </h2>
      <p className="text-sm text-[#424754] dark:text-[#c2c6d6] leading-snug">
        {description}
      </p>
    </motion.button>
  );
}
