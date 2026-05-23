/**
 * Small reusable primitives shared by every Quiz Mode panel.
 *
 * - Section    — a labelled vertical group with optional hint text below
 * - PillButton — a content-width toggle pill with a green check on selection
 */

import type { ReactNode } from "react";
import { Check } from "lucide-react";

export function Section({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="text-sm font-semibold mb-3 text-[#191c1e] dark:text-[#e1e2ec]">
        {label}
      </div>
      {children}
      {hint && (
        <p className="text-xs text-[#727785] dark:text-[#8c909f] mt-2">
          {hint}
        </p>
      )}
    </div>
  );
}

export function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all
        ${
          active
            ? "bg-[#a855f7]/20 border-[#a855f7] text-[#a855f7] dark:text-[#ddb7ff] shadow-sm shadow-[#a855f7]/20"
            : "bg-transparent border-[#c2c6d6] dark:border-[#424754] text-[#424754] dark:text-[#c2c6d6] hover:border-[#a855f7]/50 hover:text-[#a855f7] dark:hover:text-[#ddb7ff]"
        }
      `}
    >
      <span className="flex items-center gap-1.5">{children}</span>
      {active && (
        <Check size={13} strokeWidth={3} className="text-emerald-500 shrink-0" />
      )}
    </button>
  );
}
