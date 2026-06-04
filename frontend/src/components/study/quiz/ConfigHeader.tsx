/**
 * Quiz config hero — big title + subtitle. Pulled out so QuizConfigPanel
 * stays focused on the form itself.
 */

import { useTranslation } from "react-i18next";

export function ConfigHeader() {
  const { t } = useTranslation("study");
  return (
    <div className="mb-7">
      <h1 className="text-2xl sm:text-3xl font-bold text-ink-strong mb-2">
        {t("quiz.config.title")}
      </h1>
      <p className="text-base text-ink-muted">{t("quiz.config.subtitle")}</p>
    </div>
  );
}
