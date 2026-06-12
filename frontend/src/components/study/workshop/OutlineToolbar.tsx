/**
 * Action row beside the LESSONS heading: Edit outline, Regenerate outline
 * (confirm — discards generated lessons + progress), and the export buttons.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, RefreshCw } from "lucide-react";
import { ConfirmationModal } from "../../ConfirmationModal";
import type { Workshop } from "./types";
import { WorkshopExportMenu } from "./WorkshopExportMenu";

export function OutlineToolbar({
  workshop,
  rerollFailed,
  onStartEdit,
  onReroll,
}: {
  workshop: Workshop;
  rerollFailed: boolean;
  onStartEdit: () => void;
  onReroll: () => void;
}) {
  const { t } = useTranslation("study");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const BTN =
    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#c2c6d6] dark:border-[#424754] hover:bg-[#a855f7]/10 hover:border-[#a855f7]/50 text-ink-strong text-sm font-medium transition-colors";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {rerollFailed && (
        <span className="text-sm text-rose-500">{t("workshop.outline.rerollFailed")}</span>
      )}
      <button type="button" onClick={onStartEdit} className={BTN}>
        <Pencil size={13} /> {t("workshop.outline.editOutline")}
      </button>
      <button type="button" onClick={() => setConfirmOpen(true)} className={BTN}>
        <RefreshCw size={13} /> {t("workshop.outline.reroll")}
      </button>
      <WorkshopExportMenu workshop={workshop} />

      <ConfirmationModal
        isOpen={confirmOpen}
        title={t("workshop.outline.rerollTitle")}
        message={t("workshop.outline.rerollMessage")}
        confirmLabel={t("workshop.outline.rerollConfirm")}
        cancelLabel={t("workshop.outline.rerollCancel")}
        type="destructive"
        onConfirm={() => {
          setConfirmOpen(false);
          onReroll();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
