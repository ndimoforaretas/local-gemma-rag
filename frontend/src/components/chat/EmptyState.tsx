/**
 * Empty state for a fresh chat — a calm prompt plus a few hints about what you
 * can bring into a conversation (scope, attachments, voice). The full welcome
 * + section launcher lives on the Home screen.
 */

import { useTranslation } from "react-i18next";
import { Filter, Paperclip, Mic, ArrowRight, type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  onOpenHelp: () => void;
}

const HINTS: { icon: LucideIcon; key: "hint1" | "hint2" | "hint3" }[] = [
  { icon: Filter, key: "hint1" },
  { icon: Paperclip, key: "hint2" },
  { icon: Mic, key: "hint3" },
];

export function EmptyState({ onOpenHelp }: EmptyStateProps) {
  const { t } = useTranslation("chat");
  return (
    <div className="h-full flex flex-col items-center justify-center px-4">
      <img
        src="/mark.svg"
        alt="CogniVault"
        className="w-14 h-14 mb-5 drop-shadow-[0_4px_20px_rgba(167,139,250,0.4)] opacity-90"
      />
      <h3 className="text-xl font-bold text-ink-strong text-center">
        {t("empty.title")}
      </h3>
      <p className="text-sm text-ink-muted text-center max-w-sm mt-2 mb-7">
        {t("empty.intro")}
      </p>

      <div className="flex flex-col gap-3 w-full max-w-md">
        {HINTS.map(({ icon: Icon, key }) => (
          <div
            key={key}
            className="flex items-start gap-3 px-4 py-3 rounded-xl bg-white dark:bg-[#191b23] border border-[#c2c6d6] dark:border-[#424754]"
          >
            <span className="w-8 h-8 rounded-lg bg-[#a855f7]/10 text-[#a855f7] dark:text-[#ddb7ff] flex items-center justify-center shrink-0">
              <Icon size={17} />
            </span>
            <span className="text-sm text-ink leading-snug">{t(`empty.${key}`)}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onOpenHelp}
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#a855f7] dark:text-[#ddb7ff] hover:underline"
      >
        {t("empty.browseHelp")} <ArrowRight size={15} />
      </button>
    </div>
  );
}
