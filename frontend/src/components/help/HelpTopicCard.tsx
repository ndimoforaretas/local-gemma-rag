/**
 * One expandable Help topic — click to reveal its pre-written answer instantly.
 */

import { ChevronDown } from "lucide-react";
import { renderMarkdown } from "../../lib/markdownTable";
import type { HelpTopic } from "./helpTopics";

export function HelpTopicCard({
  topic,
  open,
  onToggle,
}: {
  topic: HelpTopic;
  open: boolean;
  onToggle: () => void;
}) {
  const Icon = topic.icon;
  return (
    <div className="rounded-xl border border-[#c2c6d6] dark:border-[#424754] bg-white dark:bg-[#191b23] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#a855f7]/5 dark:hover:bg-[#a855f7]/10 transition-colors"
      >
        <span className="w-9 h-9 rounded-lg bg-[#a855f7]/10 text-[#a855f7] dark:text-[#ddb7ff] flex items-center justify-center shrink-0">
          <Icon size={18} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-ink-strong">
            {topic.label}
          </span>
          <span className="block text-xs text-ink-muted truncate">
            {topic.question}
          </span>
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-ink-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-3 border-t border-[#c2c6d6] dark:border-[#424754]">
          <div
            className="ai-response prose prose-slate dark:prose-invert max-w-none text-sm"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(topic.answer) }}
          />
        </div>
      )}
    </div>
  );
}
