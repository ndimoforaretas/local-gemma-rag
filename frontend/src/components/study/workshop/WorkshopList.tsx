/**
 * Entry view for Workshop Mode: grid of existing workshops + "New" button.
 *
 * Empty state is friendly and points the user at the New button.
 */

import { useState } from "react";
import { Plus, BookOpen, Loader2 } from "lucide-react";
import { ConfirmationModal } from "../../ConfirmationModal";
import type { WorkshopListItem } from "./types";
import { WorkshopCard } from "./WorkshopCard";

export function WorkshopList({
  items,
  isLoading,
  onOpen,
  onNew,
  onDelete,
}: {
  items: WorkshopListItem[];
  isLoading: boolean;
  onOpen: (id: number) => void;
  onNew: () => void;
  onDelete: (id: number) => void;
}) {
  const [pendingDelete, setPendingDelete] = useState<WorkshopListItem | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-2xl sm:text-3xl font-bold text-[#191c1e] dark:text-white">
          {items.length === 0 ? "Your workshops" : `Your workshops (${items.length})`}
        </h2>
        <button
          type="button"
          onClick={onNew}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#a855f7] hover:bg-[#9333ea] text-white text-sm font-semibold shadow-lg shadow-[#a855f7]/20 transition-colors"
        >
          <Plus size={14} /> New Workshop
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-[#727785]">
          <Loader2 size={20} className="animate-spin" />
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="p-10 sm:p-12 rounded-2xl border border-dashed border-[#c2c6d6] dark:border-[#424754] text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#a855f7]/15 text-[#a855f7] mb-5">
            <BookOpen size={36} strokeWidth={2.2} />
          </div>
          <h3 className="text-2xl font-bold text-[#191c1e] dark:text-white mb-3">
            Build your first workshop
          </h3>
          <p className="text-base sm:text-lg text-[#424754] dark:text-[#e1e2ec] max-w-xl mx-auto mb-2 leading-relaxed">
            Workshops turn your scoped documents into a structured,
            multi-lesson learning path you can work through at your own pace.
          </p>
          <p className="text-sm text-[#727785] dark:text-[#c2c6d6]">
            Click <span className="font-semibold text-[#a855f7] dark:text-[#ddb7ff]">New Workshop</span> above to get started.
          </p>
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((item) => (
            <WorkshopCard
              key={item.id}
              item={item}
              onOpen={() => onOpen(item.id)}
              onDelete={() => setPendingDelete(item)}
            />
          ))}
        </div>
      )}

      {pendingDelete && (
        <ConfirmationModal
          isOpen
          title="Delete this workshop?"
          message={`"${pendingDelete.title}" and all its lessons will be permanently removed. This can't be undone.`}
          confirmLabel="Delete"
          cancelLabel="Keep"
          type="destructive"
          onConfirm={() => {
            onDelete(pendingDelete.id);
            setPendingDelete(null);
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
