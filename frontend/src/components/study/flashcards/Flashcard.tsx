/**
 * Single flip card with status-aware gradient razzle.
 *
 * Layout: outer perspective wrapper, inner div with preserve-3d that rotates
 * on Y axis. Each face is two stacked layers — a gradient "border" wrapper
 * and a solid inner card with the content. Faces use [backface-visibility:hidden]
 * so only one face is ever painted.
 *
 * Gradient hue + glow follows `card.status` via the helpers in
 * `flashcardStyles.ts`. The whole card lifts slightly on hover.
 */

import { useState } from "react";
import { Check, RotateCw } from "lucide-react";
import type { Flashcard as FlashcardT } from "./types";
import { gradientForStatus, glowForStatus } from "./flashcardStyles";
import { StatusBadge, StatusButton } from "./FlashcardStatusControls";

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
    if (willFlip) onSetStatus(card.card_idx, card.status, true);
  };

  const mark = (status: FlashcardT["status"]) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onSetStatus(card.card_idx, card.status === status ? null : status, false);
  };

  const gradient = gradientForStatus(card.status);
  const glow = glowForStatus(card.status);

  return (
    <div className="[perspective:1200px] h-64 group">
      {/*
        The hover-lift lives on this OUTER wrapper, separate from the flip
        rotation on the inner element. Putting both on the same element makes
        the hover transform replace (not compose with) the rotation, which
        visually breaks "click to flip" while the mouse is still over the card.
      */}
      <div className="w-full h-full transition-transform duration-300 group-hover:-translate-y-0.5">
        <div
          onClick={handleFlip}
          role="button"
          aria-label={flipped ? "Show prompt" : "Show answer"}
          className={`relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] cursor-pointer ${
            flipped ? "[transform:rotateY(180deg)]" : ""
          }`}
        >
        <CardFace gradient={gradient} glow={glow}>
          <div className="flex items-center justify-between mb-3">
            <NumberBadge n={card.card_idx + 1} />
            <StatusBadge status={card.status} />
          </div>
          <div className="flex-1 flex items-center justify-center text-center px-1">
            <p className="text-lg font-semibold text-[#191c1e] dark:text-white leading-snug">
              {card.front}
            </p>
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-3">
            <RotateCw size={12} className="text-[#a855f7] dark:text-[#ddb7ff]" />
            <span className="text-xs font-bold text-[#a855f7] dark:text-[#ddb7ff]">
              Click to flip
            </span>
          </div>
        </CardFace>

        <CardFace gradient={gradient} glow={glow} back>
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs uppercase tracking-wider font-extrabold text-[#a855f7] dark:text-[#ddb7ff]">
              Answer
            </div>
            <span className="text-xs font-medium text-[#727785] dark:text-[#8c909f] tabular-nums">
              #{card.card_idx + 1}
            </span>
          </div>
          <div className="flex-1 flex items-center justify-center text-center overflow-y-auto px-1">
            <p className="text-sm text-[#191c1e] dark:text-[#e1e2ec] leading-relaxed">
              {card.back}
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-[#c2c6d6]/30 dark:border-[#424754]/40 flex gap-2">
            <StatusButton
              tone="emerald"
              active={card.status === "mastered"}
              onClick={mark("mastered")}
              icon={<Check size={14} />}
              label="Got it"
            />
            <StatusButton
              tone="amber"
              active={card.status === "review"}
              onClick={mark("review")}
              icon={<RotateCw size={14} />}
              label="Review"
            />
          </div>
        </CardFace>
        </div>
      </div>
    </div>
  );
}

function CardFace({
  children,
  gradient,
  glow,
  back = false,
}: {
  children: React.ReactNode;
  gradient: string;
  glow: string;
  back?: boolean;
}) {
  return (
    <div
      className={`absolute inset-0 rounded-2xl p-[1.5px] bg-gradient-to-br ${gradient} shadow-md ${glow} transition-shadow group-hover:shadow-xl [backface-visibility:hidden] ${
        back ? "[transform:rotateY(180deg)]" : ""
      }`}
    >
      <div className="w-full h-full p-5 rounded-2xl bg-white dark:bg-[#191b23] flex flex-col">
        {children}
      </div>
    </div>
  );
}

function NumberBadge({ n }: { n: number }) {
  return (
    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#a855f7]/20 to-[#ec4899]/20 text-[#a855f7] dark:text-[#ddb7ff] flex items-center justify-center text-lg font-extrabold tabular-nums">
      {n}
    </div>
  );
}
