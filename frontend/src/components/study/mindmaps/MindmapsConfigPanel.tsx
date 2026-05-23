/**
 * Config form for a new mindmap. Scope mandatory; depth locked at 2 for MVP.
 */

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
  const hasScope = p.scope.length > 0;
  const canStart = hasScope && !p.isLoading;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#191c1e] dark:text-white mb-1">
          New Mindmap
        </h2>
        <p className="text-sm text-[#424754] dark:text-[#c2c6d6]">
          Pick the documents you want mapped. The mindmap will render the main
          themes and sub-topics it finds.
        </p>
      </div>

      <div className="bg-white dark:bg-[#191b23] border border-[#c2c6d6] dark:border-[#424754] rounded-2xl p-6 sm:p-8 space-y-7">
        <Section
          label="Document scope (required)"
          hint={
            hasScope
              ? "The mindmap will summarise these documents."
              : "Pick at least one category or file. Mindmaps work best when scoped to a single coherent topic."
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
              <Loader2 size={16} className="animate-spin" /> Generating…
            </>
          ) : (
            <>
              <Network size={16} /> Generate Mindmap
            </>
          )}
        </button>
      </div>
    </div>
  );
}
