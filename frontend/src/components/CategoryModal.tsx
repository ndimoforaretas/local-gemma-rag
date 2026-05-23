import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FolderOpen, X, UploadCloud } from "lucide-react";

interface CategoryModalProps {
  isOpen: boolean;
  files: File[];
  existingCategories: string[];
  onConfirm: (category: string) => void;
  onCancel: () => void;
}

const FILE_ICON: Record<string, string> = {
  pdf: "📄", docx: "📝", doc: "📝", pptx: "📊", xlsx: "📊",
  csv: "📊", md: "📋", txt: "📋", html: "🌐", htm: "🌐",
};

function fileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return FILE_ICON[ext] ?? "📄";
}

export function CategoryModal({
  isOpen,
  files,
  existingCategories,
  onConfirm,
  onCancel,
}: CategoryModalProps) {
  const [selected, setSelected] = useState("General");
  const [newName, setNewName] = useState("");
  const [creatingNew, setCreatingNew] = useState(false);
  const newInputRef = useRef<HTMLInputElement>(null);

  // Reset state whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      setSelected("General");
      setNewName("");
      setCreatingNew(false);
    }
  }, [isOpen]);

  // Focus the text input when "Create new" mode activates
  useEffect(() => {
    if (creatingNew) {
      newInputRef.current?.focus();
    }
  }, [creatingNew]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onCancel]);

  const effectiveCategory = creatingNew
    ? (newName.trim() || "General")
    : selected;

  const handleConfirm = () => {
    onConfirm(effectiveCategory);
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "__new__") {
      setCreatingNew(true);
      setNewName("");
    } else {
      setCreatingNew(false);
      setSelected(val);
    }
  };

  // Categories list — always include "General" as first option
  const categories = existingCategories.includes("General")
    ? existingCategories
    : ["General", ...existingCategories];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-x-hidden overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cat-modal-title"
            className="relative w-full max-w-md bg-white dark:bg-[#1d2027] border border-[#c2c6d6] dark:border-[#424754] rounded-2xl shadow-2xl p-6 z-10 transition-colors duration-300"
          >
            {/* Close button */}
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[#727785] hover:text-[#191c1e] dark:text-[#8c909f] dark:hover:text-[#e1e2ec] hover:bg-[#eceef0] dark:hover:bg-[#272a31] transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col gap-5">
              {/* Header */}
              <div className="flex items-start gap-4 pr-6">
                <div className="flex items-center justify-center p-3 rounded-xl shrink-0 bg-[#d0e1fb] dark:bg-[#32353c] border border-[#c2c6d6] dark:border-[#424754]">
                  <FolderOpen className="w-6 h-6 text-[#0058be] dark:text-[#adc6ff]" />
                </div>
                <div>
                  <h3
                    id="cat-modal-title"
                    className="text-lg font-bold text-[#191c1e] dark:text-[#e1e2ec] tracking-tight"
                  >
                    Categorize Files
                  </h3>
                  <p className="mt-1 text-sm text-[#424754] dark:text-[#8c909f] leading-relaxed">
                    Group these files so you can filter the AI's attention by
                    topic during chat.
                  </p>
                </div>
              </div>

              {/* File list */}
              <div className="rounded-xl border border-[#c2c6d6] dark:border-[#424754] bg-[#f2f4f6] dark:bg-[#272a31] overflow-hidden">
                <div className="px-3 py-2 border-b border-[#c2c6d6] dark:border-[#424754]">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#727785] dark:text-[#8c909f]">
                    {files.length} file{files.length !== 1 ? "s" : ""} selected
                  </span>
                </div>
                <ul className="divide-y divide-[#c2c6d6] dark:divide-[#424754] max-h-40 overflow-y-auto">
                  {files.map((f) => (
                    <li
                      key={f.name}
                      className="flex items-center gap-2.5 px-3 py-2"
                    >
                      <span className="text-base leading-none shrink-0">
                        {fileIcon(f.name)}
                      </span>
                      <span className="text-sm text-[#191c1e] dark:text-[#c2c6d6] truncate">
                        {f.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Category selector */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-[#191c1e] dark:text-[#e1e2ec]">
                  Category
                </label>

                {!creatingNew ? (
                  <select
                    value={selected}
                    onChange={handleSelectChange}
                    className="w-full rounded-xl border border-[#c2c6d6] dark:border-[#424754] bg-white dark:bg-[#272a31] px-3 py-2.5 text-sm text-[#191c1e] dark:text-[#e1e2ec] focus:outline-none focus:ring-2 focus:ring-[#0058be]/30 dark:focus:ring-[#adc6ff]/20 transition-colors"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="__new__">＋ Create new category…</option>
                  </select>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      ref={newInputRef}
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleConfirm(); }}
                      placeholder="e.g. Health, Finance, Research…"
                      maxLength={64}
                      className="flex-1 rounded-xl border border-[#0058be]/50 dark:border-[#adc6ff]/40 bg-white dark:bg-[#272a31] px-3 py-2.5 text-sm text-[#191c1e] dark:text-[#e1e2ec] placeholder:text-[#727785] dark:placeholder:text-[#8c909f] focus:outline-none focus:ring-2 focus:ring-[#0058be]/30 dark:focus:ring-[#adc6ff]/20 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => { setCreatingNew(false); setNewName(""); }}
                      className="p-2.5 rounded-xl text-[#727785] hover:text-[#191c1e] dark:text-[#8c909f] dark:hover:text-[#e1e2ec] hover:bg-[#eceef0] dark:hover:bg-[#32353c] transition-colors"
                      aria-label="Back to category list"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Preview of effective category */}
                <p className="text-xs text-[#727785] dark:text-[#8c909f]">
                  Files will be stored under{" "}
                  <span className="font-semibold text-[#0058be] dark:text-[#adc6ff]">
                    {effectiveCategory}
                  </span>
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 rounded-xl bg-[#e0e3e5] hover:bg-[#c2c6d6] dark:bg-[#272a31] dark:hover:bg-[#32353c] text-[#191c1e] dark:text-[#c2c6d6] text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#0058be] hover:bg-[#2170e4] dark:bg-[#4d8eff] dark:hover:bg-[#4d8eff]/90 text-white dark:text-[#002e6a] text-sm font-semibold shadow-[0_4px_12px_rgba(77,142,255,0.2)] transition-all"
                >
                  <UploadCloud className="w-4 h-4" />
                  Upload &amp; Sync
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
