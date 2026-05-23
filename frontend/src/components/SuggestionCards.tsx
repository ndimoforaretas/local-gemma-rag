/**
 * Discovery tiles shown on the empty-state of a fresh chat.
 *
 * 15 questions covering the breadth of the app — chat, knowledge base, the
 * four Study Hub modes, the progress dashboard, exports, privacy. Each tile
 * is icon + short label + tooltip; clicking it sends the full question to
 * the chat, automatically scoped to GUIDE.md so the agent doesn't pull
 * unrelated chunks from the user's own documents.
 *
 * Grid: 2 cols mobile → 3 sm → 4 md → 5 lg. Spans full available width
 * (no narrow `max-w-lg` corset) so on a desktop monitor we get a tidy
 * 5 × 3 mosaic.
 */

import { motion } from "framer-motion";
import {
  UploadCloud,
  FileType2,
  Paperclip,
  Mic,
  Filter,
  Quote,
  FolderTree,
  Brain,
  BookOpen,
  Layers,
  Network,
  BarChart3,
  Trophy,
  Download,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

interface Suggestion {
  icon: LucideIcon;
  label: string;   // Short tile text
  prompt: string;  // Full question sent to the AI
}

const SUGGESTIONS: Suggestion[] = [
  { icon: UploadCloud, label: "Upload docs", prompt: "How do I upload documents to the Knowledge Base?" },
  { icon: FileType2,   label: "File types",  prompt: "What file types are supported for upload?" },
  { icon: Paperclip,   label: "Chat attachments", prompt: "Can I attach files or images directly in the chat?" },
  { icon: Mic,         label: "Voice input", prompt: "How do I use voice input to ask questions?" },
  { icon: Filter,      label: "Scope filter", prompt: "How do I limit the chat to specific documents or categories?" },
  { icon: Quote,       label: "View citations", prompt: "How do I see the sources and chunks behind an AI answer?" },
  { icon: FolderTree,  label: "Categories", prompt: "How do I organise my documents into categories?" },
  { icon: Brain,       label: "Quiz Mode", prompt: "How do I generate a quiz from my documents?" },
  { icon: BookOpen,    label: "Workshops", prompt: "How do I build a multi-lesson workshop with the Workshop Creator?" },
  { icon: Layers,      label: "Flashcards", prompt: "How do flashcards work and how do I create a deck?" },
  { icon: Network,     label: "Mindmaps", prompt: "How do I create a mindmap and what can I export it as?" },
  { icon: BarChart3,   label: "Progress", prompt: "Where do I see my total study time, sessions, and activity heatmap?" },
  { icon: Trophy,      label: "Achievements", prompt: "What achievements can I unlock and how does each one work?" },
  { icon: Download,    label: "Exports", prompt: "How do I export quizzes and mindmaps to Markdown, PNG, or PDF?" },
  { icon: ShieldCheck, label: "Privacy", prompt: "Where is my data stored and how is my privacy protected?" },
];

// Every starter chip is about *using the app* — scope all of them to the
// pre-loaded user guide so the agent can't drag in unrelated KB chunks
// just because they happen to mention "files", "quiz", or "upload".
const GUIDE_SCOPE: string[] = ["GUIDE.md"];

interface SuggestionCardsProps {
  onSelect: (prompt: string, scope?: string[]) => void;
}

export function SuggestionCards({ onSelect }: SuggestionCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 w-full max-w-5xl mt-8 px-4">
      {SUGGESTIONS.map(({ icon: Icon, label, prompt }, i) => (
        <motion.button
          key={i}
          type="button"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.025 }}
          onClick={() => onSelect(prompt, GUIDE_SCOPE)}
          title={prompt}
          aria-label={prompt}
          className="
            group flex flex-col items-center justify-center gap-2 p-4 rounded-xl
            bg-white dark:bg-[#191b23]
            border border-[#c2c6d6] dark:border-[#424754]
            hover:border-[#a855f7]/60 hover:bg-[#a855f7]/5 dark:hover:bg-[#a855f7]/10
            hover:shadow-md hover:shadow-[#a855f7]/10
            transition-all cursor-pointer text-center
          "
        >
          <div className="w-10 h-10 rounded-lg bg-[#a855f7]/10 text-[#a855f7] dark:text-[#ddb7ff] flex items-center justify-center group-hover:bg-[#a855f7]/20 transition-colors">
            <Icon size={18} />
          </div>
          <span className="text-sm font-semibold text-[#191c1e] dark:text-[#e1e2ec] leading-tight">
            {label}
          </span>
        </motion.button>
      ))}
    </div>
  );
}
