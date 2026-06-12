/**
 * Compact export buttons (Markdown / PDF) for the outline view.
 *
 * Gathers the content of GENERATED lessons only — fetched through the lesson
 * query (client- or server-cached, instant). Lessons without content are
 * exported as placeholders; export never triggers a generation.
 */

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { FileDown, FileText, Loader2 } from "lucide-react";
import { api } from "../../../lib/api";
import type { Workshop } from "./types";
import {
  downloadWorkshopMarkdown,
  downloadWorkshopPdf,
  type LessonContents,
} from "./workshopExport";

export function WorkshopExportMenu({ workshop }: { workshop: Workshop }) {
  const { t } = useTranslation("study");
  const qc = useQueryClient();
  const [busy, setBusy] = useState<null | "md" | "pdf">(null);

  const gatherContents = async (): Promise<LessonContents> => {
    const contents: LessonContents = new Map();
    for (const lesson of workshop.lessons) {
      if (!lesson.has_content) continue; // never trigger generation from export
      const data = await qc.fetchQuery({
        queryKey: ["workshops", "lesson", workshop.id, lesson.lesson_idx],
        queryFn: () => api.getOrGenerateLesson(workshop.id, lesson.lesson_idx),
        staleTime: Infinity,
      });
      contents.set(lesson.lesson_idx, data.content_md);
    }
    return contents;
  };

  const run = async (kind: "md" | "pdf") => {
    setBusy(kind);
    try {
      const contents = await gatherContents();
      const note = t("workshop.export.notGenerated");
      if (kind === "md") await downloadWorkshopMarkdown(workshop, contents, note);
      else await downloadWorkshopPdf(workshop, contents, note);
    } catch (err) {
      console.error("Workshop export failed:", err);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => void run("md")}
        disabled={busy !== null}
        title={t("workshop.export.markdownTip")}
        aria-label={t("workshop.export.markdownTip")}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#c2c6d6] dark:border-[#424754] hover:bg-[#a855f7]/10 hover:border-[#a855f7]/50 text-ink-strong text-sm font-medium transition-colors disabled:opacity-50"
      >
        {busy === "md" ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
        {t("workshop.export.markdown")}
      </button>
      <button
        type="button"
        onClick={() => void run("pdf")}
        disabled={busy !== null}
        title={t("workshop.export.pdfTip")}
        aria-label={t("workshop.export.pdfTip")}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#a855f7] hover:bg-[#9333ea] disabled:bg-[#a855f7]/40 text-white text-sm font-medium transition-colors"
      >
        {busy === "pdf" ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
        {t("workshop.export.pdf")}
      </button>
    </div>
  );
}
