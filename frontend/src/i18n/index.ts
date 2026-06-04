/**
 * i18n setup (react-i18next).
 *
 * Translation files live in `src/locales/<lang>/<namespace>.json` and are
 * auto-discovered at build time — so adding a language is just:
 *   1. drop in `src/locales/<code>/*.json` (copy the `en` files, translate),
 *   2. add one entry to SUPPORTED_LANGUAGES below.
 *
 * Language choice is detected from localStorage (`cognivault.lang`) then the
 * browser, and falls back to English.
 */

import i18n, { type Resource } from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

export interface LanguageDef {
  code: string;
  /** English name (for menus/admin). */
  label: string;
  /** Endonym — how speakers write the language's own name. */
  nativeName: string;
  dir: "ltr" | "rtl";
}

/**
 * Registered languages. Only languages listed here appear in the switcher.
 * Add a new one here AFTER its `src/locales/<code>/*.json` files exist.
 */
export const SUPPORTED_LANGUAGES: LanguageDef[] = [
  { code: "en", label: "English", nativeName: "English", dir: "ltr" },
  { code: "de", label: "German", nativeName: "Deutsch", dir: "ltr" },
];

// Auto-build the resources map from every locale JSON file.
const files = import.meta.glob("../locales/**/*.json", { eager: true });
const resources: Record<string, Record<string, unknown>> = {};
for (const path in files) {
  const m = path.match(/locales\/([^/]+)\/([^/]+)\.json$/);
  if (!m) continue;
  const [, lng, ns] = m;
  (resources[lng] ??= {})[ns] =
    (files[path] as { default?: unknown }).default ?? files[path];
}

const namespaces = Object.keys(resources.en ?? { common: {} });

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: resources as unknown as Resource,
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    ns: namespaces,
    defaultNS: "common",
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "cognivault.lang",
      caches: ["localStorage"],
    },
    interpolation: { escapeValue: false }, // React already escapes
    returnNull: false,
  });

export default i18n;
