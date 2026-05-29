import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, Info, X } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: "destructive" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  type = "info",
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  // Listen for Escape key to close the modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    // Prevent background scrolling while modal is open
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onCancel]);

  // Determine colors and icon based on dialog type
  const getIconAndColors = () => {
    switch (type) {
      case "destructive":
        return {
          icon: <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />,
          iconBg: "bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50",
          confirmBtnClass:
            "bg-red-600 hover:bg-red-700 text-white dark:bg-red-950/60 dark:hover:bg-red-900/60 dark:text-red-200 dark:border dark:border-red-800/80 shadow-[0_4px_12px_rgba(239,68,68,0.15)]",
        };
      case "warning":
        return {
          icon: <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />,
          iconBg: "bg-amber-100 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50",
          confirmBtnClass:
            "bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-950/60 dark:hover:bg-amber-900/60 dark:text-amber-200 dark:border dark:border-amber-800/80 shadow-[0_4px_12px_rgba(245,158,11,0.15)]",
        };
      case "info":
      default:
        return {
          icon: <Info className="w-6 h-6 text-[#0058be] dark:text-[#adc6ff]" />,
          iconBg: "bg-[#d0e1fb] dark:bg-[#32353c] border border-[#c2c6d6] dark:border-[#424754]",
          confirmBtnClass:
            "bg-[#0058be] hover:bg-[#2170e4] text-white dark:bg-[#4d8eff] dark:hover:bg-[#4d8eff]/90 dark:text-[#002e6a] shadow-[0_4px_12px_rgba(77,142,255,0.2)]",
        };
    }
  };

  const { icon, iconBg, confirmBtnClass } = getIconAndColors();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-x-hidden overflow-y-auto">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
            aria-hidden="true"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className="relative w-full max-w-md bg-white dark:bg-[#1d2027] border border-[#c2c6d6] dark:border-[#424754] rounded-2xl shadow-2xl p-6 overflow-hidden z-10 transition-colors duration-300"
          >
            {/* Close Button */}
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-ink-muted hover:text-ink-strong hover:bg-[#eceef0] dark:hover:bg-[#272a31] transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Content */}
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <div className={`flex items-center justify-center p-3 rounded-xl shrink-0 ${iconBg}`}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <h3
                    id="modal-title"
                    className="text-lg font-bold text-ink-strong tracking-tight leading-6"
                  >
                    {title}
                  </h3>
                  <p className="mt-2 text-sm text-ink-muted leading-relaxed">
                    {message}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 rounded-xl bg-[#e0e3e5] hover:bg-[#c2c6d6] dark:bg-[#272a31] dark:hover:bg-[#32353c] text-ink text-sm font-medium transition-colors cursor-pointer"
                >
                  {cancelLabel}
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  className={`px-5 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${confirmBtnClass}`}
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
