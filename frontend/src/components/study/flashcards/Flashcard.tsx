/**
 * Single flip card.
 *
 * Click the body to flip the card (front ↔ back). On the back, two status
 * chips ("Got it" / "Review again") let the user mark progress without
 * re-flipping.
 *
 * Implementation: CSS 3D — outer perspective wrapper, inner div with
 * `transform-style: preserve-3d` rotates on Y axis. Front and back are
 * stacked siblings, back rotated 180° and the parent's rotation reveals it.
 */

import { useState } from "react";
import { Check, RotateCw } from "lucide-react";
import type { Flashcard as FlashcardT } from "./types";

export function Flashcard({
  card,
  onSetStatus,
}: {
  card: FlashcardT;
  onSetStatus: (
    cardIdx: number,
    status: FlashcardT["status"],
    recordFlip: boolean,
  ) => void;
}) {
  const [flipped, setFlipped] = useState(false);

  const handleFlip = () => {
    const willFlip = !flipped;
    setFlipped(willFlip);
    // Only count a flip the first time the user reveals the back of each card
    // per page load (avoids inflating flip_count on idle clicks).
    if (willFlip) {
      onSetStatus(card.card_idx, card.status, true);
    }
  };

  const mark = (status: FlashcardT["status"]) => (e: React.MouseEvent) => {
    e.stopPropagation();
    // Toggle off if the same status is clicked again.
    onSetStatus(card.card_idx, card.status === status ? null : status, false);
  };

  return (
    <div className="[perspective:1200px] h-56">
      <div
        onClick={handleFlip}
        role="button"
        aria-label={flipped ? "Show prompt" : "Show answer"}
        className={`relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] cursor-pointer ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        {/* Front */}
        <CardFace>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-[#a855f7] mb-2">
            #{card.card_idx + 1}
          </div>
          <p className="text-base font-medium text-[#191c1e] dark:text-white leading-snug">
            {card.front}
          </p>
          <div className="mt-auto pt-3 flex items-center justify-between text-[10px] text-[#727785] dark:text-[#8c909f]">
            <span className="flex items-center gap-1">
              <RotateCw size={10} /> Click to flip
            </span>
            <StatusBadge status={card.status} />
          </div>
        </CardFace>

        {/* Back */}
        <CardFace back>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-[#a855f7] mb-2">
            Answer
          </div>
          <p className="text-sm text-[#191c1e] dark:text-[#e1e2ec] leading-relaxed flex-1 overflow-y-auto">
            {card.back}
          </p>
          <div className="mt-3 flex gap-2 pt-2 border-t border-[#c2c6d6]/40 dark:border-[#424754]/40">
            <button
              type="button"
              onClick={mark("mastered")}
              className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium inline-flex items-center justify-center gap-1 border transition-colors ${
                card.status === "mastered"
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                  : "border-[#c2c6d6] dark:border-[#424754] hover:border-emerald-500/50 text-[#424754] dark:text-[#c2c6d6]"
              }`}
            >
              <Check size={11} /> Got it
            </button>
            <button
              type="button"
              onClick={mark("review")}
              className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium inline-flex items-center justify-center gap-1 border transition-colors ${
                card.status === "review"
                  ? "bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300"
                  : "border-[#c2c6d6] dark:border-[#424754] hover:border-amber-500/50 text-[#424754] dark:text-[#c2c6d6]"
              }`}
            >
              <RotateCw size={11} /> Review
            </button>
          </div>
        </CardFace>
      </div>
    </div>
  );
}

function CardFace({
  children,
  back = false,
}: {
  children: React.ReactNode;
  back?: boolean;
}) {
  return (
    <div
      className={`absolute inset-0 p-5 rounded-2xl border border-[#c2c6d6] dark:border-[#424754] bg-white dark:bg-[#191b23] shadow-sm flex flex-col [backface-visibility:hidden] ${
        back ? "[transform:rotateY(180deg)]" : ""
      }`}
    >
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: FlashcardT["status"] }) {
  if (!status) return null;
  if (status === "mastered") {
    return (
      <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
        Mastered
      </span>
    );
  }
  return (
    <span className="px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
      Review
    </span>
  );
}
