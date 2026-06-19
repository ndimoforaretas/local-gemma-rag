/**
 * Language picker for the sidebar. Lists every registered language (flag +
 * native name) and switches the UI live (choice persists via i18next's
 * localStorage detector).
 *
 * - Expanded sidebar: a full <select> with an `appearance-none` body + a custom
 *   chevron padded safely inside the right edge.
 * - Collapsed sidebar: a compact flag button that cycles to the next language,
 *   so the control never disappears.
 */

import { useTranslation } from "react-i18next";
import { Languages, ChevronDown } from "lucide-react";
import { Tooltip } from "./Tooltip";
import { SUPPORTED_LANGUAGES } from "../i18n";

export function LanguageSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const { i18n, t } = useTranslation("common");
  const current =
    SUPPORTED_LANGUAGES.find((l) => l.code === i18n.resolvedLanguage) ??
    SUPPORTED_LANGUAGES[0];

  // ── Collapsed: a flag button that cycles through the registered languages ──
  if (collapsed) {
    const cycle = () => {
      const idx = SUPPORTED_LANGUAGES.findIndex((l) => l.code === current.code);
      const next = SUPPORTED_LANGUAGES[(idx + 1) % SUPPORTED_LANGUAGES.length];
      void i18n.changeLanguage(next.code);
    };
    return (
      <Tooltip content={`${t("language")}: ${current.nativeName}`} position="right">
        <button
          type="button"
          onClick={cycle}
          aria-label={`${t("language")}: ${current.nativeName}`}
          className="w-11 h-11 flex items-center justify-center rounded-xl text-xl border border-[#c2c6d6] dark:border-[#424754] text-ink-muted hover:text-ink-strong hover:bg-[#e0e3e5] dark:hover:bg-[#272a31] transition-colors"
        >
          <span aria-hidden="true">{current.flag}</span>
        </button>
      </Tooltip>
    );
  }

  // ── Expanded: full select ─────────────────────────────────────────────────
  return (
    <label className="flex items-center gap-2 px-1">
      <Languages size={18} className="shrink-0 text-ink-muted" />
      <span className="sr-only">{t("language")}</span>
      <div className="relative flex-1 min-w-0">
        <select
          aria-label={t("language")}
          value={i18n.resolvedLanguage}
          onChange={(e) => void i18n.changeLanguage(e.target.value)}
          className="w-full appearance-none bg-transparent text-sm font-medium text-ink-strong rounded-lg pl-2 pr-8 py-1 border border-[#c2c6d6] dark:border-[#424754] focus:outline-none focus:border-[#a855f7]/50 cursor-pointer"
        >
          {SUPPORTED_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code} className="text-black">
              {l.flag} {l.nativeName}
            </option>
          ))}
        </select>
        <ChevronDown
          size={15}
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted"
        />
      </div>
    </label>
  );
}
