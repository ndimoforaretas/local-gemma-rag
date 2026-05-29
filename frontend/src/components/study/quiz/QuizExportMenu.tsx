/**
 * Export menu shown on the quiz results screen.
 *
 * Lets the user pick what to include (questions only / + answers / + explanations)
 * and the format (Markdown download or PDF via browser print).
 *
 * Stateless aside from the locally-selected content level.
 */

import { useState } from "react";
import { Download, FileText, Printer } from "lucide-react";
import {
  downloadMarkdown,
  printAsPdf,
  type ExportContent,
} from "./quizExport";
import type { QuizQuestion } from "./types";

const LEVELS: { id: ExportContent; label: string }[] = [
  { id: "questions", label: "Questions only" },
  { id: "answers", label: "+ correct answers" },
  { id: "explanations", label: "+ answers & explanations" },
];

export function QuizExportMenu({ questions }: { questions: QuizQuestion[] }) {
  const [content, setContent] = useState<ExportContent>("explanations");

  return (
    <div className="p-4 sm:p-5 rounded-2xl border border-[#c2c6d6] dark:border-[#424754] bg-white dark:bg-[#191b23]">
      <div className="flex items-center gap-2 mb-1">
        <Download size={16} className="text-[#a855f7]" />
        <h3 className="text-sm font-semibold text-ink-strong">
          Export this quiz
        </h3>
      </div>
      <p className="text-xs text-ink-muted mb-3">
        Pick what to include, then choose a format.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {LEVELS.map((l) => {
          const active = content === l.id;
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => setContent(l.id)}
              aria-pressed={active}
              className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
                active
                  ? "bg-[#a855f7]/15 border-[#a855f7] text-[#a855f7] dark:text-[#ddb7ff]"
                  : "bg-transparent border-[#c2c6d6] dark:border-[#424754] text-ink-muted hover:border-[#a855f7]/50"
              }`}
            >
              {l.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            // Fire-and-forget: saveBlob handles its own errors / user cancels.
            void downloadMarkdown(questions, content);
          }}
          title="Download as Markdown (.md) — opens a Save As dialog where you can rename and choose a folder"
          aria-label="Download as Markdown — opens a Save As dialog"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#c2c6d6] dark:border-[#424754] hover:border-[#a855f7]/50 text-sm font-medium text-ink-strong transition-colors"
        >
          <FileText size={14} /> Markdown
        </button>
        <button
          type="button"
          onClick={() => printAsPdf(questions, content)}
          title="Save as PDF via the browser print dialog"
          aria-label="Save as PDF via the browser print dialog"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#a855f7] hover:bg-[#9333ea] text-white text-sm font-medium transition-colors"
        >
          <Printer size={14} /> PDF
        </button>
      </div>
    </div>
  );
}
