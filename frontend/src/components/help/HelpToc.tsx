/**
 * Sticky "on this page" nav for the Help section — jump to a FAQ group, with
 * the active group highlighted as you scroll. Desktop-only (hidden below xl).
 */

import { useTranslation } from "react-i18next";

export function HelpToc({
  groups,
  active,
  onJump,
}: {
  groups: { id: string; title: string }[];
  active: string;
  onJump: (id: string) => void;
}) {
  const { t } = useTranslation("help");
  return (
    <nav aria-label={t("toc.aria")} className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wider text-ink-muted font-semibold px-3 mb-1.5">
        {t("toc.onThisPage")}
      </span>
      {groups.map(({ id, title }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onJump(id)}
            className={`text-left text-sm px-3 py-1.5 rounded-r-lg border-l-2 transition-colors ${
              isActive
                ? "border-[#a855f7] text-[#a855f7] dark:text-[#ddb7ff] font-semibold bg-[#a855f7]/5"
                : "border-transparent text-ink-muted hover:text-ink-strong hover:border-[#c2c6d6] dark:hover:border-[#424754]"
            }`}
          >
            {title}
          </button>
        );
      })}
    </nav>
  );
}
