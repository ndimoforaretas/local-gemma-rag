/**
 * Language picker for the sidebar. Lists every registered language and switches
 * the UI live (choice persists via i18next's localStorage detector).
 */

import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { SUPPORTED_LANGUAGES } from "../i18n";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation("common");

  return (
    <label className="flex items-center gap-2 px-1">
      <Languages size={18} className="shrink-0 text-ink-muted" />
      <span className="sr-only">{t("language")}</span>
      <select
        aria-label={t("language")}
        value={i18n.resolvedLanguage}
        onChange={(e) => void i18n.changeLanguage(e.target.value)}
        className="flex-1 min-w-0 bg-transparent text-sm font-medium text-ink-strong rounded-lg px-1.5 py-1 border border-[#c2c6d6] dark:border-[#424754] focus:outline-none focus:border-[#a855f7]/50 cursor-pointer"
      >
        {SUPPORTED_LANGUAGES.map((l) => (
          <option key={l.code} value={l.code} className="text-black">
            {l.nativeName}
          </option>
        ))}
      </select>
    </label>
  );
}
