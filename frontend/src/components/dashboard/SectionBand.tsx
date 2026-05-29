/**
 * Alternating-shade band wrapper for dashboard sections.
 *
 * Tone "b" gets a subtle elevated background; tone "a" stays on the page
 * background. Both are darker (light mode: lighter) than the inner cards, so
 * cards always pop. Combined with generous section spacing, this gives each
 * section a clearly distinct zone.
 */

import type { ReactNode } from "react";

export function SectionBand({
  tone,
  children,
}: {
  tone: "a" | "b";
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-3xl px-5 sm:px-8 py-8 sm:py-10 ${
        tone === "b" ? "bg-[#eceef1] dark:bg-[#15181f]" : ""
      }`}
    >
      {children}
    </div>
  );
}
