import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Filter, X, ChevronDown, ChevronRight, FileText, Folder } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { IndexedDocument } from "../types/api";

interface DocScopeFilterProps {
  /** Currently selected document names. Empty = search all. */
  selected: string[];
  onChange: (selected: string[]) => void;
}

function IndeterminateCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="mt-0.5 accent-[#a855f7] shrink-0 cursor-pointer"
    />
  );
}

export function DocScopeFilter({ selected, onChange }: DocScopeFilterProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // Popover opens upward in chat (trigger near bottom) but should flip
  // downward in Study Hub (trigger near top). Computed when `open` flips true.
  const [direction, setDirection] = useState<"up" | "down">("down");
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { data } = useQuery({
    queryKey: ["indexedDocs"],
    queryFn: () => api.listIndexedDocs(),
    staleTime: 30_000,
  });

  const docs: IndexedDocument[] = data?.documents ?? [];

  // Group docs by category
  const grouped: Record<string, IndexedDocument[]> = {};
  for (const doc of docs) {
    const cat = doc.category ?? "General";
    (grouped[cat] ??= []).push(doc);
  }
  const categories = Object.keys(grouped).sort();

  // Category helpers
  const isCategoryFull = (cat: string) =>
    grouped[cat].every((d) => selected.includes(d.name));
  const isCategoryPartial = (cat: string) =>
    grouped[cat].some((d) => selected.includes(d.name)) && !isCategoryFull(cat);

  const toggleCategory = (cat: string) => {
    const names = grouped[cat].map((d) => d.name);
    if (isCategoryFull(cat)) {
      onChange(selected.filter((s) => !names.includes(s)));
    } else {
      onChange([...selected.filter((s) => !names.includes(s)), ...names]);
    }
  };

  const toggleDoc = (name: string) => {
    if (selected.includes(name)) {
      onChange(selected.filter((s) => s !== name));
    } else {
      onChange([...selected, name]);
    }
  };

  const toggleExpand = (cat: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const clearAll = () => {
    onChange([]);
    setOpen(false);
  };

  // Decide open direction based on available viewport space.
  // Runs synchronously before paint so the popover never flashes in the wrong spot.
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const ESTIMATED_PANEL_HEIGHT = 360;
    if (spaceBelow >= ESTIMATED_PANEL_HEIGHT) setDirection("down");
    else if (spaceAbove >= ESTIMATED_PANEL_HEIGHT) setDirection("up");
    else setDirection(spaceBelow >= spaceAbove ? "down" : "up");
  }, [open]);

  // Close on outside click
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

  const hasFilter = selected.length > 0;

  // Compute smart pill label
  let pillLabel: string;
  if (!hasFilter) {
    pillLabel = "All documents";
  } else {
    const fullCats = categories.filter((c) => isCategoryFull(c));
    const partialCats = categories.filter((c) => isCategoryPartial(c));
    if (
      fullCats.length === 1 &&
      partialCats.length === 0 &&
      grouped[fullCats[0]].length === selected.length
    ) {
      pillLabel = fullCats[0];
    } else if (selected.length === 1) {
      pillLabel = truncate(selected[0], 22);
    } else {
      pillLabel = `${selected.length} documents`;
    }
  }

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
        aria-label={hasFilter ? `Searching ${selected.length} document(s)` : "Filter by category or document"}
        aria-expanded={open}
      >
        <Filter size={11} />
        <span>{pillLabel}</span>
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
          className={`absolute left-0 z-50 w-80 rounded-xl border border-[#c2c6d6] dark:border-[#424754] bg-white dark:bg-[#1d2027] shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden ${
            direction === "up" ? "bottom-full mb-2" : "top-full mt-2"
          }`}
          role="dialog"
          aria-label="Select categories or documents to search"
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
              ? "Agent searches only the selected documents."
              : "Select a category or individual documents to restrict the search scope."}
          </p>

          <ul className="max-h-64 overflow-y-auto py-1">
            {categories.map((cat) => {
              const catDocs = grouped[cat];
              const full = isCategoryFull(cat);
              const partial = isCategoryPartial(cat);
              const isExp = expanded.has(cat);

              return (
                <li key={cat}>
                  {/* Category row */}
                  <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#f2f4f6] dark:hover:bg-[#272a31] transition-colors">
                    <IndeterminateCheckbox
                      checked={full}
                      indeterminate={partial}
                      onChange={() => toggleCategory(cat)}
                    />
                    <button
                      type="button"
                      onClick={() => toggleExpand(cat)}
                      className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
                      aria-expanded={isExp}
                    >
                      {isExp ? (
                        <ChevronDown size={12} className="text-[#727785] dark:text-[#8c909f] shrink-0" />
                      ) : (
                        <ChevronRight size={12} className="text-[#727785] dark:text-[#8c909f] shrink-0" />
                      )}
                      <Folder size={12} className="text-[#a855f7] dark:text-[#ddb7ff] shrink-0" />
                      <span className="text-xs font-semibold text-[#191c1e] dark:text-[#e1e2ec] truncate">
                        {cat}
                      </span>
                      <span className="text-[10px] text-[#727785] dark:text-[#8c909f] ml-auto shrink-0">
                        {catDocs.length} file{catDocs.length !== 1 ? "s" : ""}
                      </span>
                    </button>
                  </div>

                  {/* Individual docs (expanded) */}
                  {isExp && (
                    <ul className="ml-6 border-l border-[#c2c6d6] dark:border-[#424754]">
                      {catDocs.map((doc) => {
                        const checked = selected.includes(doc.name);
                        return (
                          <li key={doc.name}>
                            <label className="flex items-start gap-2 px-3 py-1.5 cursor-pointer hover:bg-[#f2f4f6] dark:hover:bg-[#272a31] transition-colors">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleDoc(doc.name)}
                                className="mt-0.5 accent-[#a855f7] shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <FileText size={11} className="text-[#727785] dark:text-[#8c909f] shrink-0" />
                                  <span className="text-xs text-[#191c1e] dark:text-[#e1e2ec] truncate">
                                    {doc.name}
                                  </span>
                                </div>
                                <span className="text-[10px] text-[#727785] dark:text-[#8c909f]">
                                  {doc.chunk_count} chunk{doc.chunk_count !== 1 ? "s" : ""}
                                </span>
                              </div>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
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
