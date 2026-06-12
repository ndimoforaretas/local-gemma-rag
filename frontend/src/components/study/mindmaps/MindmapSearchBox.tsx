/**
 * Search input for the mindmap canvas: type to highlight matching nodes
 * (others dim), Enter / Shift+Enter cycles matches, Esc clears.
 */

import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import type { MindmapSearch } from "./useMindmapSearch";

export function MindmapSearchBox({ search }: { search: MindmapSearch }) {
  const { t } = useTranslation("study");
  const hasQuery = search.query.trim().length > 0;

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) search.prev();
      else search.next();
    } else if (e.key === "Escape") {
      search.clear();
    }
  };

  return (
    <div className="flex items-center gap-1 pl-2 pr-1 h-8 rounded-lg border bg-white/90 dark:bg-[#191b23]/90 border-[#c2c6d6] dark:border-[#424754] focus-within:border-[#a855f7]/60 transition-colors">
      <Search size={13} className="text-ink-muted shrink-0" />
      <input
        type="text"
        value={search.query}
        onChange={(e) => search.setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={t("mindmap.canvas.searchPlaceholder")}
        aria-label={t("mindmap.canvas.searchPlaceholder")}
        className="w-36 bg-transparent text-xs text-ink-strong placeholder:text-ink-muted outline-none"
      />
      {hasQuery && (
        <>
          <span
            className={`text-xs tabular-nums px-0.5 ${search.matchCount ? "text-ink-muted" : "text-rose-500"}`}
          >
            {search.position}/{search.matchCount}
          </span>
          <IconBtn
            title={t("mindmap.canvas.prevMatch")}
            onClick={search.prev}
            disabled={!search.matchCount}
          >
            <ChevronUp size={13} />
          </IconBtn>
          <IconBtn
            title={t("mindmap.canvas.nextMatch")}
            onClick={search.next}
            disabled={!search.matchCount}
          >
            <ChevronDown size={13} />
          </IconBtn>
          <IconBtn title={t("mindmap.canvas.clearSearch")} onClick={search.clear}>
            <X size={13} />
          </IconBtn>
        </>
      )}
    </div>
  );
}

function IconBtn({
  title,
  onClick,
  disabled,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className="p-1 rounded text-ink-muted hover:text-ink-strong hover:bg-[#a855f7]/10 disabled:opacity-40 transition-colors"
    >
      {children}
    </button>
  );
}
