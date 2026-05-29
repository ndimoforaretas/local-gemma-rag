import { Database } from "lucide-react";
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
        className="w-full text-left"
      >
        <div className="flex items-start justify-between mb-4 gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#d0e1fb] dark:bg-[#32353c] flex items-center justify-center text-[#0058be] dark:text-[#adc6ff] shrink-0">
            <Database size={24} />
          </div>
          <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-[#eceef0] dark:bg-[#272a31] text-[#424754] dark:text-[#c2c6d6]">
            {isExpanded ? "Hide files" : "Show files"}
          </span>
        </div>
        <h4 className="text-lg sm:text-xl font-bold mb-2 text-[#191c1e] dark:text-[#e1e2ec]">{f.name}</h4>
        <p className="text-sm sm:text-base text-[#424754] dark:text-[#8c909f] mb-4 sm:mb-5">{f.description}</p>
        <div className="flex items-center justify-between text-sm text-[#727785] dark:text-[#8c909f] font-medium">
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
            <p className="text-sm text-[#727785] dark:text-[#8c909f]">No files in this library yet.</p>
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
