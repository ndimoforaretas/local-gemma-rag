import { AlertTriangle, X } from "lucide-react";

export function WarningToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-200 text-sm animate-in fade-in slide-in-from-bottom-2">
      <AlertTriangle size={16} className="shrink-0 text-amber-400" />
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 p-0.5 rounded hover:bg-amber-500/20 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}
