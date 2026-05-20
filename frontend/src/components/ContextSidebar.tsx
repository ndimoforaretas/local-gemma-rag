import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Database, ExternalLink, FileText, ChevronDown, X } from "lucide-react";
import type { ContextItem } from "../types/api";

interface ContextSidebarProps {
  contextItems: ContextItem[];
  /**
   * When provided, a close (×) button is rendered in the header.
   * Used for the mobile drawer mode where the parent controls visibility.
   */
  onClose?: () => void;
  /**
   * When true the component renders as a plain fixed-width panel with no
   * Framer Motion width animation (the parent handles the slide-in).
   */
  isDrawer?: boolean;
}

function formatTypeLabel(type: string): string {
  if (!type) return "DOC";
  return type.toUpperCase();
}

function CitationCard({ item, index }: { item: ContextItem; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasPreview = Boolean(item.text);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white dark:bg-[#1d2027] border border-[#c2c6d6] dark:border-[#424754] rounded-xl overflow-hidden transition-colors duration-200 hover:border-[#a855f7]/50 dark:hover:border-[#a855f7]/50"
    >
      {/* Card header — always visible */}
      <div className="p-4 flex flex-col gap-2">
        <div className="flex items-start gap-3">
          <FileText
            size={16}
            className="text-[#0058be] dark:text-[#adc6ff] mt-0.5 shrink-0"
          />
          <span className="text-base font-medium leading-tight text-[#191c1e] dark:text-[#e1e2ec] line-clamp-2">
            {item.title}
            {item.page !== undefined && (
              <span className="ml-1.5 text-xs font-normal text-[#727785] dark:text-[#8c909f]">
                p.{item.page}
              </span>
            )}
          </span>
        </div>

        <div
          className="text-sm text-[#727785] dark:text-[#8c909f] pl-7 truncate"
          title={item.path}
        >
          {item.path}
        </div>

        <div className="pl-7 mt-1 flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#e0e3e5] dark:bg-[#272a31] text-[#505f76] dark:text-[#c2c6d6]">
            {formatTypeLabel(item.type)}
          </span>

          <div className="flex items-center gap-2">
            {hasPreview && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                aria-label={expanded ? "Collapse chunk preview" : "View chunk text"}
                className="inline-flex items-center gap-0.5 text-xs text-[#a855f7] dark:text-[#ddb7ff] hover:underline focus:outline-none"
              >
                {expanded ? "Hide" : "View chunk"}
                <ChevronDown
                  size={12}
                  className={`transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
                />
              </button>
            )}
            <a
              href={`/static/docs/${item.title}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[#727785] dark:text-[#8c909f] hover:text-[#0058be] dark:hover:text-[#adc6ff] transition-colors"
              title="Open source file"
            >
              Open <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>

      {/* Expandable chunk preview */}
      <AnimatePresence initial={false}>
        {expanded && item.text && (
          <motion.div
            key="preview"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mx-4 mb-4 rounded-lg bg-[#f2f4f6] dark:bg-[#272a31] border border-[#c2c6d6] dark:border-[#424754] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#727785] dark:text-[#8c909f] mb-1.5">
                Retrieved chunk
              </p>
              <p className="text-xs leading-relaxed text-[#191c1e] dark:text-[#c2c6d6] whitespace-pre-wrap break-words line-clamp-[12]">
                {item.text}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Shared inner content ──────────────────────────────────────────────────────

function SidebarContent({
  contextItems,
  onClose,
}: {
  contextItems: ContextItem[];
  onClose?: () => void;
}) {
  return (
    <>
      <div className="p-6 border-b border-[#c2c6d6] dark:border-[#424754] flex items-center gap-2">
        <Database size={16} className="text-[#0058be] dark:text-[#adc6ff]" />
        <div className="flex items-center justify-between w-full gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[#727785] dark:text-[#8c909f]">
            Context Used
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#e0e3e5] dark:bg-[#272a31] text-[#424754] dark:text-[#c2c6d6]">
              {contextItems.length}
            </span>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close sources panel"
                className="p-1 rounded-lg text-[#727785] dark:text-[#8c909f] hover:text-[#191c1e] dark:hover:text-[#e1e2ec] hover:bg-[#e0e3e5] dark:hover:bg-[#32353c] transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#727785] dark:text-[#8c909f]">
        Referenced Sources
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-2">
        {contextItems.map((item, i) => (
          <CitationCard key={i} item={item} index={i} />
        ))}
      </div>
    </>
  );
}

// ── Public component ──────────────────────────────────────────────────────────

export function ContextSidebar({
  contextItems,
  onClose,
  isDrawer = false,
}: ContextSidebarProps) {
  // ── Drawer mode (mobile overlay — parent handles slide-in animation) ────────
  if (isDrawer) {
    if (!contextItems.length) return null;
    return (
      <div className="w-80 max-w-[85vw] h-full border-l border-[#c2c6d6] dark:border-[#424754] bg-[#f2f4f6] dark:bg-[#191b23] flex flex-col overflow-hidden">
        <SidebarContent contextItems={contextItems} onClose={onClose} />
      </div>
    );
  }

  // ── Desktop mode (push layout — own Framer Motion width animation) ──────────
  return (
    <AnimatePresence>
      {contextItems.length > 0 && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          className="border-l border-[#c2c6d6] dark:border-[#424754] bg-[#f2f4f6] dark:bg-[#191b23] flex flex-col overflow-hidden transition-colors duration-300"
        >
          <SidebarContent contextItems={contextItems} onClose={onClose} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
