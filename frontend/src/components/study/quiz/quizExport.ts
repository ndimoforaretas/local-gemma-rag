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

import { saveBlob } from "../../../lib/saveBlob";
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

export async function downloadMarkdown(
  questions: QuizQuestion[],
  content: ExportContent,
): Promise<void> {
  const md = buildMarkdown(questions, content);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  await saveBlob(blob, `quiz-${dateStamp()}.md`, {
    description: "Markdown file",
    mimeType: "text/markdown",
    extension: "md",
  });
}

// ── PDF (real file, via jsPDF) ──────────────────────────────────────────────
//
// We generate and download an actual .pdf rather than relying on the browser's
// print engine (the old hidden-iframe `print()` was unreliable across browsers).
// jsPDF is loaded lazily so it stays out of the initial bundle.

export async function downloadPdf(
  questions: QuizQuestion[],
  content: ExportContent,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const MARGIN = 48;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const maxW = pageW - MARGIN * 2;
  let y = MARGIN;

  const ensure = (space: number) => {
    if (y + space > pageH - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  // `indent` shifts the left margin (used for options).
  const write = (
    str: string,
    opts: { size: number; bold?: boolean; color?: [number, number, number]; indent?: number; gap?: number } = { size: 11 },
  ) => {
    const { size, bold = false, color = [17, 17, 17], indent = 0, gap = 4 } = opts;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const lineH = size * 1.4;
    const lines = doc.splitTextToSize(str, maxW - indent) as string[];
    for (const line of lines) {
      ensure(lineH);
      doc.text(line, MARGIN + indent, y);
      y += lineH;
    }
    y += gap;
  };

  // ── Header ──
  write("Quiz", { size: 22, bold: true, gap: 2 });
  write(`Exported on ${todayLabel()}`, { size: 9, color: [120, 120, 120], gap: 16 });

  // ── Questions ──
  const showAnswers = content !== "questions";
  questions.forEach((q, i) => {
    ensure(40);
    write(`${i + 1}. ${q.question}`, { size: 12, bold: true, gap: 6 });
    q.options.forEach((opt, idx) => {
      const correct = showAnswers && idx === q.correct_index;
      write(`${correct ? "[x]" : "[ ]"}  ${opt}${correct ? "   (correct)" : ""}`, {
        size: 10,
        bold: correct,
        color: correct ? [21, 128, 61] : [40, 40, 40],
        indent: 16,
        gap: 2,
      });
    });
    if (content === "explanations" && q.explanation) {
      write(`Why: ${q.explanation}`, {
        size: 9.5,
        color: [124, 58, 237],
        indent: 16,
        gap: 4,
      });
    }
    y += 10; // space between questions
  });

  doc.save(`quiz-${dateStamp()}.pdf`);
}
