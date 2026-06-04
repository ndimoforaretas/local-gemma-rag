/**
 * Config form for a new mindmap. Scope mandatory; depth locked at 2 for MVP.
 */

import { useTranslation } from "react-i18next";
import { Network, Loader2, AlertCircle } from "lucide-react";
import { DocScopeFilter } from "../../DocScopeFilter";
import { Section } from "../quiz/QuizPrimitives";

export interface MindmapsConfigPanelProps {
  scope: string[];
  setScope: (s: string[]) => void;
  onStart: () => void;
  isLoading: boolean;
  error: string | null;
}

export function MindmapsConfigPanel(p: MindmapsConfigPanelProps) {
  const { t } = useTranslation("study");
  const hasScope = p.scope.length > 0;
  const canStart = hasScope && !p.isLoading;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-ink-strong mb-1">
          {t("mindmap.config.title")}
        </h2>
        <p className="text-sm text-ink-muted">
          {t("mindmap.config.subtitle")}
        </p>
      </div>

      <div className="bg-white dark:bg-[#191b23] border border-[#c2c6d6] dark:border-[#424754] rounded-2xl p-6 sm:p-8 space-y-7">
        <Section
          label={t("mindmap.config.scopeLabel")}
          hint={
            hasScope
              ? t("mindmap.config.scopeHintHas")
              : t("mindmap.config.scopeHintEmpty")
          }
        >
          <DocScopeFilter selected={p.scope} onChange={p.setScope} />
        </Section>

        {p.error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{p.error}</span>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={p.onStart}
          disabled={!canStart}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#a855f7] hover:bg-[#9333ea] disabled:bg-[#a855f7]/40 disabled:cursor-not-allowed text-white font-semibold shadow-lg shadow-[#a855f7]/20 transition-colors"
        >
          {p.isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> {t("mindmap.config.generating")}
            </>
          ) : (
            <>
              <Network size={16} /> {t("mindmap.config.generate")}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
