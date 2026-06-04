/**
 * Single source of truth for the app's "how-to" help topics, with pre-written
 * answers (rendered instantly — no AI round-trip). Grouped by area and used by
 * the Help section.
 */

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

/**
 * Stable identity + icon for each topic/group. All display text (group title,
 * topic label/question/answer) lives in the `help` translation namespace, keyed
 * by these ids: `help:groups.<groupId>` and `help:topics.<topicId>.{label,question,answer}`.
 */
export interface HelpTopic {
  id: string;
  icon: LucideIcon;
}

export interface HelpGroup {
  id: string;
  topics: HelpTopic[];
}

export const HELP_GROUPS: HelpGroup[] = [
  {
    id: "gettingStarted",
    topics: [
      { id: "uploadDocuments", icon: UploadCloud },
      { id: "supportedTypes", icon: FileType2 },
      { id: "attachFiles", icon: Paperclip },
      { id: "voiceInput", icon: Mic },
      { id: "focusDocuments", icon: Filter },
      { id: "seeSources", icon: Quote },
      { id: "categories", icon: FolderTree },
    ],
  },
  {
    id: "tools",
    topics: [
      { id: "quizzes", icon: Brain },
      { id: "workshops", icon: BookOpen },
      { id: "flashcards", icon: Layers },
      { id: "mindmaps", icon: Network },
    ],
  },
  {
    id: "progressData",
    topics: [
      { id: "dashboard", icon: BarChart3 },
      { id: "achievements", icon: Trophy },
      { id: "exporting", icon: Download },
      { id: "privacy", icon: ShieldCheck },
    ],
  },
];

export const HELP_TOPICS: HelpTopic[] = HELP_GROUPS.flatMap((g) => g.topics);
