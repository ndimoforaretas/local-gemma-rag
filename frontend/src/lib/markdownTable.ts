/**
 * Markdown rendering helpers for the chat view.
 */

import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: true });

// ── Table numeric-column detection ───────────────────────────────────────────

function isLikelyNumericCell(value: string): boolean {
  const normalized = value.replace(/ /g, " ").trim();
  if (!normalized) return false;
  const compact = normalized
    .replace(/^[\s$€£¥₹]+/, "")
    .replace(/[,%\s$€£¥₹()]/g, "")
    .replace(/,/g, "");
  return /^[-+]?\d*\.?\d+$/.test(compact);
}

/**
 * Post-process rendered Markdown HTML: add `is-numeric-column` to every cell
 * in a column where ≥ 75% of body cells look like numbers. Applied client-side
 * only (no DOMParser on SSR).
 */
export function addNumericColumnClasses(html: string): string {
  if (typeof window === "undefined" || typeof DOMParser === "undefined") return html;

  const doc = new DOMParser().parseFromString(html, "text/html");
  const tables = doc.querySelectorAll("table");

  tables.forEach((table) => {
    const allRows = Array.from(table.querySelectorAll("tr"));
    if (allRows.length < 2) return;

    const bodyRows = Array.from(table.querySelectorAll("tbody tr"));
    const sampleRows = bodyRows.length > 0 ? bodyRows : allRows.slice(1);
    const maxCols = allRows.reduce((max, row) => Math.max(max, row.children.length), 0);

    for (let col = 0; col < maxCols; col++) {
      let numericCount = 0;
      let checkedCount = 0;
      sampleRows.forEach((row) => {
        const cell = row.children[col] as HTMLElement | undefined;
        if (!cell) return;
        const text = cell.textContent?.trim() ?? "";
        if (!text) return;
        checkedCount++;
        if (isLikelyNumericCell(text)) numericCount++;
      });
      if (checkedCount > 0 && numericCount / checkedCount >= 0.75) {
        allRows.forEach((row) => {
          const cell = row.children[col] as HTMLElement | undefined;
          if (cell) cell.classList.add("is-numeric-column");
        });
      }
    }
  });

  return doc.body.innerHTML;
}

// ── Message helpers ───────────────────────────────────────────────────────────

/** Render Markdown to HTML with numeric-column classes applied. */
export function renderMarkdown(content: string): string {
  return addNumericColumnClasses(marked.parse(content) as string);
}

/** Extract a HH:MM timestamp from a message ID (which encodes Date.now()). */
export function formatMessageTime(id: string): string {
  const ts = Number(id.split("-")[0]);
  if (!Number.isFinite(ts)) return "";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
