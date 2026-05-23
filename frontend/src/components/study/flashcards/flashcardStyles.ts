/**
 * Status-aware visual styling for flashcards.
 *
 * Gradient border + soft glow shift color based on `status`:
 *   null       → purple → fuchsia → pink   (default razzle)
 *   "mastered" → emerald → cyan            (success cool tones)
 *   "review"   → amber → orange → rose     (attention warm tones)
 */

import type { FlashcardStatus } from "./types";

export function gradientForStatus(status: FlashcardStatus): string {
  if (status === "mastered") return "from-emerald-500 via-emerald-400 to-cyan-500";
  if (status === "review") return "from-amber-500 via-orange-400 to-rose-500";
  return "from-[#a855f7] via-fuchsia-500 to-pink-500";
}

export function glowForStatus(status: FlashcardStatus): string {
  if (status === "mastered") return "shadow-emerald-500/20";
  if (status === "review") return "shadow-amber-500/20";
  return "shadow-[#a855f7]/20";
}
