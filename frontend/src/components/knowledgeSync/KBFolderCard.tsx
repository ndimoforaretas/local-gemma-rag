import { ChevronDown, Database } from "lucide-react";
import { KBFileCard } from "./KBFileCard";
import { sortFiles, type SortOption } from "./kbSortUtils";
import type { KBFolder } from "../../types/api";

interface KBFolderCardProps {
  folder: KBFolder;
  index: number;
  isExpanded: boolean;
  sortOption: SortOption;
  deletingFilename: string | null;
  onToggle: (name: string) => void;
  onDelete: (e: React.MouseEvent, filename: string) => void;
}

export function KBFolderCard({
  folder: f, index, isExpanded, sortOption, deletingFilename, onToggle, onDelete,
}: KBFolderCardProps) {
  const allFiles = f.subfolders?.flatMap((s) => s.files) ?? [];
  const sortedFiles = sortFiles(allFiles, sortOption);
  const folderPanelId = `folder-files-${index}`;

  return (
    <div className="bg-[#ffffff] dark:bg-[#1d2027] border border-[#c2c6d6] dark:border-[#424754] rounded-2xl p-4 sm:p-6 transition-all hover:border-[#a855f7] dark:hover:border-[#a855f7] flex flex-col">
      <button
        type="button"
        onClick={() => onToggle(f.name)}
        aria-expanded={isExpanded}
        aria-controls={folderPanelId}
        className="group/toggle w-full text-left"
      >
        <div className="flex items-center gap-3.5 mb-2">
          <div className="w-12 h-12 rounded-xl bg-[#d0e1fb] dark:bg-[#32353c] flex items-center justify-center text-[#0058be] dark:text-[#adc6ff] shrink-0">
            <Database size={24} />
          </div>
          <h4 className="text-lg sm:text-xl font-bold text-ink-strong min-w-0 truncate">
            {f.name}
          </h4>
          <span
            className={`ml-auto shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
              isExpanded
                ? "bg-[#a855f7]/15 border-[#a855f7]/40 text-[#7c3aed] dark:text-[#ddb7ff]"
                : "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500/60 text-emerald-700 dark:text-emerald-400 group-hover/toggle:bg-emerald-100 dark:group-hover/toggle:bg-emerald-500/20 group-hover/toggle:border-emerald-500"
            }`}
          >
            {isExpanded ? "Hide files" : "Show files"}
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : "rotate-0"}`}
            />
          </span>
        </div>
        <p className="text-sm sm:text-base text-ink-muted mb-4 sm:mb-5">{f.description}</p>
        <div className="flex items-center justify-between text-sm text-ink-muted font-medium">
          <span>{allFiles.length} Documents</span>
          <span>{f.updated}</span>
        </div>
      </button>

      {isExpanded && (
        <div
          id={folderPanelId}
          role="region"
          aria-label={`${f.name} files`}
          className="mt-4 pt-4 border-t border-[#c2c6d6] dark:border-[#424754]"
        >
          {allFiles.length === 0 ? (
            <p className="text-sm text-ink-muted">No files in this library yet.</p>
          ) : (
            <div role="list" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {sortedFiles.map((file, idx) => (
                <KBFileCard
                  key={idx}
                  file={file}
                  isDeleting={deletingFilename === file.name}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
