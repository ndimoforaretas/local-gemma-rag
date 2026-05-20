/**
 * DocScopeFilter — Document-scoped search filter for the chat view.
 *
 * Shows a "🎯 Scope" pill above the chat input.  Clicking opens a popover
 * listing every indexed document with a checkbox.  When one or more documents
 * are checked, the agent only searches those documents.
 *
 * No documents checked = search all (default behaviour).
 */

import { useEffect, useRef, useState } from "react";
import { Filter, X, ChevronDown, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { IndexedDocument } from "../types/api";

interface DocScopeFilterProps {
  /** Currently selected document names. Empty = search all. */
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function DocScopeFilter({ selected, onChange }: DocScopeFilterProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { data } = useQuery({
    queryKey: ["indexedDocs"],
    queryFn: () => api.listIndexedDocs(),
    staleTime: 30_000,
  });

  const docs: IndexedDocument[] = data?.documents ?? [];

  // Close on outside click.
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggle = (name: string) => {
    if (selected.includes(name)) {
      onChange(selected.filter((s) => s !== name));
    } else {
      onChange([...selected, name]);
    }
  };

  const clearAll = () => {
    onChange([]);
    setOpen(false);
  };

  const hasFilter = selected.length > 0;

  // Don't render if there are no indexed documents.
  if (docs.length === 0) return null;

  return (
    <div className="relative flex items-center gap-2">
      {/* Scope button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
          hasFilter
            ? "bg-[#a855f7]/10 border-[#a855f7]/40 text-[#a855f7] dark:text-[#ddb7ff]"
            : "bg-[#f2f4f6] dark:bg-[#272a31] border-[#c2c6d6] dark:border-[#424754] text-[#727785] dark:text-[#8c909f] hover:border-[#a855f7]/40 hover:text-[#a855f7] dark:hover:text-[#ddb7ff]"
        }`}
        aria-label={hasFilter ? `Searching ${selected.length} document(s)` : "Filter by document"}
        aria-expanded={open}
      >
        <Filter size={11} />
        {hasFilter ? (
          <span>
            {selected.length === 1
              ? truncate(selected[0], 22)
              : `${selected.length} documents`}
          </span>
        ) : (
          <span>All documents</span>
        )}
        <ChevronDown
          size={11}
          className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Clear chip when active */}
      {hasFilter && (
        <button
          type="button"
          onClick={clearAll}
          aria-label="Clear document filter"
          className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-[#a855f7]/10 border border-[#a855f7]/30 text-[#a855f7] dark:text-[#ddb7ff] hover:bg-[#a855f7]/20 transition-colors"
        >
          <X size={11} />
          Clear
        </button>
      )}

      {/* Popover */}
      {open && (
        <div
          ref={panelRef}
          className="absolute bottom-full left-0 mb-2 z-50 w-72 rounded-xl border border-[#c2c6d6] dark:border-[#424754] bg-white dark:bg-[#1d2027] shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden"
          role="dialog"
          aria-label="Select documents to search"
        >
          <div className="px-3 py-2 border-b border-[#c2c6d6] dark:border-[#424754] flex items-center justify-between">
            <span className="text-xs font-semibold text-[#191c1e] dark:text-[#e1e2ec]">
              Search scope
            </span>
            {hasFilter && (
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-[#a855f7] dark:text-[#ddb7ff] hover:underline"
              >
                Clear all
              </button>
            )}
          </div>

          <p className="px-3 pt-2 pb-1 text-[11px] text-[#727785] dark:text-[#8c909f]">
            {hasFilter
              ? "Agent searches only the checked documents."
              : "Check documents to restrict the search scope."}
          </p>

          <ul className="max-h-60 overflow-y-auto py-1" role="listbox" aria-multiselectable="true">
            {docs.map((doc) => {
              const checked = selected.includes(doc.name);
              return (
                <li key={doc.name}>
                  <label className="flex items-start gap-2.5 px-3 py-2 cursor-pointer hover:bg-[#f2f4f6] dark:hover:bg-[#272a31] transition-colors">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(doc.name)}
                      className="mt-0.5 accent-[#a855f7] shrink-0"
                      aria-selected={checked}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <FileText size={12} className="text-[#727785] dark:text-[#8c909f] shrink-0" />
                        <span className="text-xs font-medium text-[#191c1e] dark:text-[#e1e2ec] truncate">
                          {doc.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#727785] dark:text-[#8c909f]">
                        {doc.type} · {doc.chunk_count} chunk{doc.chunk_count !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>

          <div className="px-3 py-2 border-t border-[#c2c6d6] dark:border-[#424754] flex justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-[#0058be] dark:text-[#adc6ff] hover:underline"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}
