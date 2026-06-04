/**
 * Help — a guided FAQ. Browse every "how do I…" topic grouped by area; click
 * one to reveal its answer instantly. A sticky TOC jumps between groups and
 * tracks the section you're viewing.
 */

import { useEffect, useRef, useState } from "react";
import { LifeBuoy } from "lucide-react";
import { HELP_GROUPS, type HelpTopic } from "./help/helpTopics";
import { HelpTopicCard } from "./help/HelpTopicCard";
import { HelpToc } from "./help/HelpToc";

const GROUP_TITLES = HELP_GROUPS.map((g) => g.title);

export function Help() {
  const [openLabel, setOpenLabel] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState(GROUP_TITLES[0]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const toggle = (topic: HelpTopic) =>
    setOpenLabel((cur) => (cur === topic.label ? null : topic.label));

  const jump = (title: string) =>
    sectionRefs.current[title]?.scrollIntoView({ behavior: "smooth", block: "start" });

  // Scroll-spy: the active group is the last section whose heading has passed
  // the top of the scroll container. Deterministic — updates on scroll up too.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const onScroll = () => {
      const rootTop = root.getBoundingClientRect().top;
      let current = GROUP_TITLES[0];
      for (const title of GROUP_TITLES) {
        const el = sectionRefs.current[title];
        if (el && el.getBoundingClientRect().top - rootTop <= 96) current = title;
      }
      setActiveGroup(current);
    };
    onScroll();
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => root.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto w-full px-6 sm:px-8 py-8 flex gap-10">
        <div className="flex-1 min-w-0 max-w-3xl">
          <header className="mb-8">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full bg-[#a855f7]/15 text-[#a855f7] dark:text-[#ddb7ff] mb-3">
              <LifeBuoy size={13} /> Help &amp; Guide
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-ink-strong">
              How can we help?
            </h1>
            <p className="text-base text-ink-muted mt-2 max-w-xl">
              Pick a question to see the answer right here — no typing needed.
            </p>
          </header>

          <div className="space-y-8">
            {HELP_GROUPS.map((group) => (
              <section
                key={group.title}
                data-group={group.title}
                ref={(el) => {
                  sectionRefs.current[group.title] = el;
                }}
                className="scroll-mt-4"
              >
                <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-muted mb-3">
                  {group.title}
                </h2>
                <div className="flex flex-col gap-2">
                  {group.topics.map((topic) => (
                    <HelpTopicCard
                      key={topic.label}
                      topic={topic}
                      open={openLabel === topic.label}
                      onToggle={() => toggle(topic)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        <aside className="hidden xl:block w-44 shrink-0">
          <div className="sticky top-8">
            <HelpToc groups={GROUP_TITLES} active={activeGroup} onJump={jump} />
          </div>
        </aside>
      </div>
    </div>
  );
}
