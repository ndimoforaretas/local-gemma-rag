import { motion } from "framer-motion";
import {
  FolderPlus,
  FileType2,
  Paperclip,
  Trash2,
  RefreshCw,
  LayoutDashboard,
} from "lucide-react";

const SUGGESTIONS = [
  { icon: FolderPlus, text: "How do I add documents to the knowledge base?" },
  { icon: FileType2, text: "What file types can I upload?" },
  { icon: Paperclip, text: "Can I attach files directly in the chat?" },
  { icon: Trash2, text: "How do I delete a document?" },
  {
    icon: RefreshCw,
    text: "What happens if the app restarts during ingestion?",
  },
  {
    icon: LayoutDashboard,
    text: "How do I switch between Chat and Knowledge Base?",
  },
] as const;

interface SuggestionCardsProps {
  onSelect: (prompt: string) => void;
}

export function SuggestionCards({ onSelect }: SuggestionCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 w-full max-w-lg mt-8">
      {SUGGESTIONS.map(({ icon: Icon, text }, i) => (
        <motion.button
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => onSelect(text)}
          className="text-left px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-500/40 hover:border-emerald-500 dark:hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:shadow-sm transition-all group cursor-pointer">
          <div className="flex items-center gap-3">
            <Icon
              size={16}
              className="shrink-0 text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors"
            />
            <span className="text-sm font-medium leading-snug text-[#191c1e] dark:text-on-surface">
              {text}
            </span>
          </div>
        </motion.button>
      ))}
    </div>
  );
}
