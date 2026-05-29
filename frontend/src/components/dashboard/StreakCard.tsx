/**
 * Streak card — the motivational centrepiece of the summary row.
 *
 * Shows the current consecutive-day streak with a flame that pulses while the
 * streak is live, plus the user's personal best. Celebrates with "Personal
 * best!" when the current run ties or beats the record.
 */

import { Flame } from "lucide-react";

export function StreakCard({
  current,
  best,
}: {
  current: number;
  best: number;
}) {
  const active = current > 0;
  const isRecord = active && current >= best;
  const dayLabel = (n: number) => `${n} day${n === 1 ? "" : "s"}`;

  let sublabel: string;
  if (!active) {
    sublabel = best > 0 ? `Personal best: ${dayLabel(best)}` : "Study today to start a streak";
  } else if (isRecord) {
    sublabel = "🔥 Personal best — keep it going!";
  } else {
    sublabel = `Personal best: ${dayLabel(best)}`;
  }

  return (
    <div className="p-5 rounded-2xl border border-[#c2c6d6] dark:border-[#424754] bg-white dark:bg-[#191b23]">
      <div className="flex items-center gap-2 mb-3">
        <Flame
          size={18}
          className={`text-amber-500 ${active ? "animate-pulse" : "opacity-60"}`}
        />
        <span className="text-xs font-semibold uppercase tracking-wider text-[#727785] dark:text-[#8c909f]">
          Current streak
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-[#191c1e] dark:text-white tabular-nums">
          {active ? dayLabel(current) : "—"}
        </span>
        {isRecord && (
          <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
            Best
          </span>
        )}
      </div>
      <p className="text-xs text-[#727785] dark:text-[#8c909f] mt-1">{sublabel}</p>
    </div>
  );
}
