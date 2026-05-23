/**
 * Sticky side TOC for lesson content.
 *
 * - Lists H2/H3 from the rendered lesson (H3 indented one level).
 * - Active heading is determined by IntersectionObserver against the
 *   actual rendered headings in the article element.
 * - Click smoothly scrolls the target into view and updates the active
 *   marker.
 *
 * Hidden below the `lg` breakpoint per the desktop-first design. The lesson
 * is still readable on narrow screens — the TOC just doesn't render.
 */

import { useEffect, useState } from "react";
import { ListOrdered } from "lucide-react";
import type { TocHeading } from "./tocHelpers";

export function TocSidebar({
  headings,
  articleEl,
}: {
  headings: TocHeading[];
  articleEl: HTMLElement | null;
}) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  // Scroll-spy: highlight the topmost heading currently visible in the viewport.
  useEffect(() => {
    if (!articleEl || headings.length === 0) return;
    const targets = headings
      .map((h) => articleEl.querySelector(`#${CSS.escape(h.slug)}`))
      .filter((el): el is HTMLElement => el != null);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const topmost = visible.reduce((a, b) =>
          a.boundingClientRect.top < b.boundingClientRect.top ? a : b,
        );
        setActiveSlug(topmost.target.id);
      },
      // Top region "armed", bottom 60% ignored — feels right when reading.
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 },
    );
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [articleEl, headings]);

  if (headings.length === 0) return null;

  const handleClick = (e: React.MouseEvent, slug: string) => {
    e.preventDefault();
    if (!articleEl) return;
    const el = articleEl.querySelector(`#${CSS.escape(slug)}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSlug(slug);
    }
  };

  return (
    <aside className="hidden lg:block w-48 shrink-0 sticky top-6 self-start">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#727785] dark:text-[#8c909f] mb-3">
        <ListOrdered size={12} />
        On this page
      </div>
      <nav>
        <ul className="border-l border-[#c2c6d6] dark:border-[#424754]">
          {headings.map((h) => {
            const active = activeSlug === h.slug;
            return (
              <li key={h.slug}>
                <a
                  href={`#${h.slug}`}
                  onClick={(e) => handleClick(e, h.slug)}
                  className={`
                    block py-1 px-3 text-xs leading-snug transition-colors border-l-2 -ml-px
                    ${h.level === 3 ? "pl-6" : ""}
                    ${
                      active
                        ? "border-[#a855f7] text-[#a855f7] dark:text-[#ddb7ff] font-semibold"
                        : "border-transparent text-[#424754] dark:text-[#c2c6d6] hover:text-[#a855f7] dark:hover:text-[#ddb7ff]"
                    }
                  `}
                >
                  {h.text}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
