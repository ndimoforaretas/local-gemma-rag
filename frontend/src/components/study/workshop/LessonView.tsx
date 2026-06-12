/**
 * Full-page lesson reader: rendered Markdown + side TOC + Mark complete.
 *
 * Layout (desktop):  [ article (flex-1) ] [ sticky TOC (48 px col) ]
 * Layout (narrow):   single column; TOC hidden.
 *
 * Rendering pipeline:
 *   1. Strip the leading H1 from the backend Markdown (we render the title
 *      explicitly so it can be styled separately from body content).
 *   2. Parse H2/H3 headings client-side to build the TOC list.
 *   3. Render Markdown via `marked`, then assign matching `id`s to the H2/H3
 *      elements in the DOM so anchor scrolling + IntersectionObserver work.
 */

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { marked } from "marked";
import type { LessonContent } from "./types";
import { TocSidebar } from "./TocSidebar";
import { parseTocHeadings } from "./tocHelpers";

export function LessonView({
  lesson,
  isLoading,
  isError,
  onRetry,
  isCompleted,
  isMarking,
  onBack,
  onMarkComplete,
}: {
  lesson: LessonContent | undefined;
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  isCompleted: boolean;
  isMarking: boolean;
  onBack: () => void;
  onMarkComplete: () => void;
}) {
  const { t } = useTranslation("study");
  // Body markdown with any leading H1 removed (title rendered separately).
  const bodyMd = useMemo(
    () => (lesson ? lesson.content_md.replace(/^\s*#\s+[^\n]+\n+/, "") : ""),
    [lesson?.content_md],
  );
  const headings = useMemo(() => parseTocHeadings(bodyMd), [bodyMd]);
  const html = useMemo(() => (bodyMd ? (marked.parse(bodyMd) as string) : ""), [bodyMd]);

  // Capture the article element when it mounts so the TOC can scroll-spy it.
  const [articleEl, setArticleEl] = useState<HTMLElement | null>(null);

  // After render, stamp matching ids onto the H2/H3 elements so anchor links work.
  useEffect(() => {
    if (!articleEl) return;
    const els = articleEl.querySelectorAll("h2, h3");
    els.forEach((el, i) => {
      const h = headings[i];
      if (h) el.id = h.slug;
    });
  }, [articleEl, html, headings]);

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink-strong"
      >
        <ArrowLeft size={14} />
        {t("workshop.lesson.back")}
      </button>

      {isLoading && (
        <div className="flex items-center gap-2 p-8 rounded-2xl border border-[#c2c6d6] dark:border-[#424754] bg-white dark:bg-[#191b23] text-ink-muted">
          <Loader2 size={18} className="animate-spin" />
          <span>{t("workshop.lesson.loading")}</span>
        </div>
      )}

      {!isLoading && !lesson && isError && (
        <div className="flex flex-col items-start gap-3 p-8 rounded-2xl border border-amber-500/40 bg-amber-500/5">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertCircle size={18} />
            <span className="font-medium">{t("workshop.lesson.errorTitle")}</span>
          </div>
          <p className="text-sm text-ink-muted">{t("workshop.lesson.errorBody")}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#a855f7] hover:bg-[#9333ea] text-white text-sm font-medium transition-colors"
            >
              <RotateCcw size={14} /> {t("workshop.lesson.retry")}
            </button>
          )}
        </div>
      )}

      {!isLoading && lesson && (
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_12rem] lg:gap-6">
          <article
            ref={setArticleEl}
            className="p-6 sm:p-8 rounded-2xl border border-[#c2c6d6] dark:border-[#424754] bg-white dark:bg-[#191b23]"
          >
            <h1 className="text-3xl font-bold tracking-tight text-ink-strong mb-6">
              {lesson.title}
            </h1>
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </article>
          <TocSidebar headings={headings} articleEl={articleEl} />
        </div>
      )}

      {!isLoading && lesson && (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onMarkComplete}
            disabled={isCompleted || isMarking}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-colors ${
              isCompleted
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 cursor-default"
                : "bg-[#a855f7] hover:bg-[#9333ea] disabled:bg-[#a855f7]/40 text-white"
            }`}
          >
            {isMarking ? (
              <>
                <Loader2 size={14} className="animate-spin" /> {t("workshop.lesson.saving")}
              </>
            ) : isCompleted ? (
              <>
                <CheckCircle2 size={14} /> {t("workshop.lesson.completed")}
              </>
            ) : (
              <>
                <CheckCircle2 size={14} /> {t("workshop.lesson.markComplete")}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
