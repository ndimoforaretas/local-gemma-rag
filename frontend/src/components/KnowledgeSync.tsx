/**
 * KnowledgeSync — the Knowledge Base page.
 *
 * Composes the Vault Audit panel, Upload Drop Zone, sync notices,
 * DBOS progress timeline, folder/file library, and modals.
 *
 * Heavy logic lives in ./knowledgeSync/:
 *  - useKBSync: all mutations, polling, drag/drop, upload handlers
 *  - UploadDropZone, SyncProgressPanel, KBFolderCard, KBFileCard: UI pieces
 *  - kbSortUtils: sort helpers  |  syncTimeline: step definitions
 */

import { useId, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { VaultAudit } from "./VaultAudit";
import { ConfirmationModal } from "./ConfirmationModal";
import { CategoryModal } from "./CategoryModal";
import { UploadDropZone } from "./knowledgeSync/UploadDropZone";
import { SyncProgressPanel } from "./knowledgeSync/SyncProgressPanel";
import { KBFolderCard } from "./knowledgeSync/KBFolderCard";
import { useKBSync } from "./knowledgeSync/useKBSync";
import { getSortLabel, type SortOption } from "./knowledgeSync/kbSortUtils";
import { api } from "../lib/api";
import type { KBFolder } from "../types/api";

export function KnowledgeSync() {
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(() => new Set());
  const [sortOption, setSortOption] = useState<SortOption>("name-asc");
  const [sortAnnouncement, setSortAnnouncement] = useState("Files sorted by Name A-Z.");
  const sortSelectLabelId = useId();
  const sortStatusId = useId();

  const { data: kbFolders = [], refetch: refetchKB } = useQuery<KBFolder[]>({
    queryKey: ["kbFolders"],
    queryFn: async () => {
      try { return (await api.getKB()).folders || []; } catch { return []; }
    },
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => api.getCategories(),
  });
  const existingCategories = categoriesData?.categories ?? ["General"];

  const kb = useKBSync(refetchKB);

  useEffect(() => {
    setSortAnnouncement(`Files sorted by ${getSortLabel(sortOption)}.`);
  }, [sortOption]);

  const toggleFolder = (name: string) =>
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const showLibrary =
    kbFolders.length > 0 &&
    kb.syncStatus !== "SYNCING" &&
    kb.syncStatus !== "UPLOADING";

  const showEmpty =
    kbFolders.length === 0 &&
    kb.syncStatus !== "SYNCING" &&
    kb.syncStatus !== "UPLOADING";

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto flex flex-col gap-6 sm:gap-8">
        <VaultAudit />

        <UploadDropZone
          syncStatus={kb.syncStatus}
          isDragActive={kb.isDragActive}
          canUpload={kb.canUpload}
          fileInputRef={kb.fileInputRef}
          dragHandlers={kb.dragHandlers}
          onKeyDown={kb.handleDropZoneKeyDown}
          onFileChange={kb.handleFileInputChange}
        />

        {kb.syncNotice && (
          <div aria-live="polite" className="rounded-xl border border-emerald-300/70 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            {kb.syncNotice}
          </div>
        )}

        {kb.syncError && (
          <div aria-live="assertive" className="rounded-xl border border-red-300/70 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {kb.syncError}
          </div>
        )}

        {(kb.syncStatus === "SYNCING" || kb.syncStatus === "SUCCESS") && (
          <SyncProgressPanel
            syncStatus={kb.syncStatus}
            steps={kb.steps}
            largeFileWarning={kb.largeFileWarning}
          />
        )}
      </div>

      {showLibrary && (
        <div className="max-w-5xl mx-auto mt-8 flex flex-col gap-4 sm:gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xl sm:text-2xl font-semibold text-ink-strong">
              Current Libraries
            </h3>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted">
              <span id={sortSelectLabelId}>Sort files</span>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                aria-labelledby={sortSelectLabelId}
                aria-describedby={sortStatusId}
                className="min-w-[220px] rounded-lg border border-[#c2c6d6] dark:border-[#424754] bg-white dark:bg-[#272a31] px-3 py-2 text-sm text-ink-strong focus:outline-none focus:ring-2 focus:ring-[#0058be]/20 dark:focus:ring-[#a855f7]/30"
              >
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="date-newest">Date newest first</option>
                <option value="size-largest">File size largest first</option>
              </select>
            </label>
            <p id={sortStatusId} className="sr-only" aria-live="polite">{sortAnnouncement}</p>
          </div>
          <div className="flex flex-col gap-4 sm:gap-6">
            {kbFolders.map((folder, i) => (
              <KBFolderCard
                key={i}
                folder={folder}
                index={i}
                isExpanded={!collapsedFolders.has(folder.name)}
                sortOption={sortOption}
                deletingFilename={kb.deletingFilename}
                onToggle={toggleFolder}
                onDelete={kb.handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      {showEmpty && (
        <div className="max-w-5xl mx-auto mt-8">
          <div className="rounded-2xl border border-dashed border-[#c2c6d6] dark:border-[#424754] bg-[#ffffff] dark:bg-[#1d2027] p-6 sm:p-8 text-center">
            <h4 className="text-lg sm:text-xl font-semibold text-ink-strong">No documents yet</h4>
            <p className="mt-2 text-sm sm:text-base text-ink-muted">
              Upload documents to build your knowledge base and enable document-grounded answers.
            </p>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={kb.isDeleteModalOpen}
        title="Remove Document"
        message={`Are you sure you want to remove "${kb.fileToDelete}" from the knowledge base? This action cannot be undone.`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        type="destructive"
        onConfirm={kb.confirmDeleteFile}
        onCancel={kb.cancelDeleteFile}
      />

      <CategoryModal
        isOpen={kb.isCategoryModalOpen}
        files={kb.pendingFiles}
        existingCategories={existingCategories}
        onConfirm={kb.handleCategoryConfirm}
        onCancel={kb.handleCategoryCancel}
      />
    </div>
  );
}
