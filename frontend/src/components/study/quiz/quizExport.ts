/**
 * Quiz export utilities — Markdown download + PDF (via browser print).
 *
 * Design notes
 * ------------
 * No external dependencies. Markdown is built as a string and downloaded via
 * a Blob URL. PDF generation reuses the browser's own print engine by writing
 * a styled HTML document into a hidden iframe and calling `print()` on it —
 * this gives high-quality PDF output without bundling jsPDF (~80 KB) or
 * html2canvas (~250 KB), and works in every modern browser.
 *
 * The three content levels (questions / answers / explanations) share the
 * same question-shape helpers so adding a fourth level later is a one-liner.
 */

import type { QuizQuestion } from "./types";

export type ExportContent = "questions" | "answers" | "explanations";

function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function dateStamp(): string {
  // For filenames: 2026-05-23
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    (
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }) as Record<string, string>
    )[c] ?? c,
  );
}

// ── Markdown ────────────────────────────────────────────────────────────────

export function buildMarkdown(
  questions: QuizQuestion[],
  content: ExportContent,
): string {
  const lines: string[] = [
    `# Quiz`,
    ``,
    `_Exported on ${todayLabel()}_`,
    ``,
  ];
  questions.forEach((q, i) => {
    lines.push(`## ${i + 1}. ${q.question}`, ``);
    q.options.forEach((opt, idx) => {
      const isCorrect = idx === q.correct_index;
      const marker = content !== "questions" && isCorrect ? "- [x]" : "- [ ]";
      const suffix = content !== "questions" && isCorrect ? "  **(correct)**" : "";
      lines.push(`${marker} ${opt}${suffix}`);
    });
    if (content === "explanations" && q.explanation) {
      lines.push(``, `**Why:** ${q.explanation}`);
    }
    lines.push(``, `---`, ``);
  });
  return lines.join("\n");
}

export function downloadMarkdown(
  questions: QuizQuestion[],
  content: ExportContent,
): void {
  const md = buildMarkdown(questions, content);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `quiz-${dateStamp()}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── PDF (via browser print) ────────────────────────────────────────────────

const PRINT_STYLES = `
  body { font: 14px/1.55 system-ui, -apple-system, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 24px; color: #111; }
  h1 { font-size: 26px; margin: 0 0 4px; }
  .subtitle { color: #666; font-size: 12px; margin-bottom: 28px; }
  .q { margin-bottom: 22px; page-break-inside: avoid; }
  .q h2 { font-size: 15px; margin: 0 0 10px; font-weight: 600; }
  ul { margin: 0; padding: 0; list-style: none; }
  li { margin: 5px 0; padding-left: 24px; position: relative; }
  li::before { content: "☐"; position: absolute; left: 0; }
  li.correct::before { content: "☑"; color: #15803d; }
  li.correct { font-weight: 600; color: #15803d; }
  .why { margin-top: 8px; padding: 8px 12px; background: #faf5ff; border-left: 3px solid #a855f7; font-size: 13px; }
  @media print { body { margin: 0; } }
`;

export function buildPrintableHTML(
  questions: QuizQuestion[],
  content: ExportContent,
): string {
  const renderQ = (q: QuizQuestion, i: number) => {
    const opts = q.options
      .map((opt, idx) => {
        const isCorrect = idx === q.correct_index;
        const cls = content !== "questions" && isCorrect ? "correct" : "";
        return `<li class="${cls}">${escapeHtml(opt)}</li>`;
      })
      .join("");
    const why =
      content === "explanations" && q.explanation
        ? `<div class="why"><strong>Why:</strong> ${escapeHtml(q.explanation)}</div>`
        : "";
    return `<div class="q"><h2>${i + 1}. ${escapeHtml(q.question)}</h2><ul>${opts}</ul>${why}</div>`;
  };
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Quiz</title><style>${PRINT_STYLES}</style></head><body><h1>Quiz</h1><div class="subtitle">Exported on ${todayLabel()}</div>${questions.map(renderQ).join("")}</body></html>`;
}

export function printAsPdf(
  questions: QuizQuestion[],
  content: ExportContent,
): void {
  const html = buildPrintableHTML(questions, content);
  // Hidden iframe avoids popup blockers and keeps the SPA state intact.
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
  });
  document.body.appendChild(iframe);

  const cw = iframe.contentWindow;
  if (!cw) {
    document.body.removeChild(iframe);
    return;
  }
  cw.document.open();
  cw.document.write(html);
  cw.document.close();

  // Give the iframe a tick to render fonts/styles before printing.
  iframe.onload = () => {
    cw.focus();
    cw.print();
    // Most browsers fire print() synchronously; clean up after a delay.
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 1500);
  };
}
