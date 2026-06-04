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

export interface HelpTopic {
  icon: LucideIcon;
  label: string; // short title
  question: string; // the question this answers
  answer: string; // markdown answer (shown instantly)
}

export interface HelpGroup {
  title: string;
  topics: HelpTopic[];
}

export const HELP_GROUPS: HelpGroup[] = [
  {
    title: "Getting started",
    topics: [
      {
        icon: UploadCloud,
        label: "Upload documents",
        question: "How do I add my documents?",
        answer:
          "Open **Knowledge Base** in the sidebar, then drag files onto the upload zone or use the file picker. You can assign a category as you upload. You can also paste a **URL** to import a web page. Files are ingested automatically and become searchable in chat.",
      },
      {
        icon: FileType2,
        label: "Supported file types",
        question: "What file types can I upload?",
        answer:
          "PDF, Word (`.docx`), PowerPoint (`.pptx`), Markdown (`.md`), plain text (`.txt`), CSV, and images (PNG/JPG). Scanned or image-only PDFs are **OCR'd** automatically so their text becomes searchable.",
      },
      {
        icon: Paperclip,
        label: "Attach files to a message",
        question: "Can I attach files or images to a single message?",
        answer:
          "Yes. Click the **paperclip** in the message box (or drag onto it) to attach documents or images to one question. They're analysed just for that message — afterwards you can choose **Add to Knowledge Base** to keep them permanently.",
      },
      {
        icon: Mic,
        label: "Voice input",
        question: "How do I ask with my voice?",
        answer:
          "Tap the **microphone** in the message box and speak. Your speech is transcribed **locally** and dropped into the input, so you can review and edit it before sending.",
      },
      {
        icon: Filter,
        label: "Focus on specific documents",
        question: "How do I limit answers to certain documents?",
        answer:
          "Use the **scope filter** above the message box to restrict answers to a category or specific files. The active scope is stamped on your message as a badge, and it clears after sending so your next message uses everything again.",
      },
      {
        icon: Quote,
        label: "See the sources",
        question: "How do I check where an answer came from?",
        answer:
          "Every answer lists its **sources** in the right-hand panel. Expand any entry to see the exact text chunk the AI used, its relevance score, and a link to open the original file.",
      },
      {
        icon: FolderTree,
        label: "Organise with categories",
        question: "How do I organise my documents?",
        answer:
          "When uploading, give a document a **category** (e.g. *Contracts*, *Research*, *Recipes*). Categories show up as folders in the scope filter, so you can focus a chat — or any generated material — on one topic area.",
      },
    ],
  },
  {
    title: "Tools",
    topics: [
      {
        icon: Brain,
        label: "Quizzes",
        question: "How do I generate a quiz?",
        answer:
          "Go to **Study Hub → Quiz Mode**, scope it to your documents, choose difficulty, the number of questions, and **Practice** (instant feedback) or **Exam** (deferred) mode, then start. Every quiz is saved so you can resume or retake it.",
      },
      {
        icon: BookOpen,
        label: "Workshops",
        question: "How do I build a multi-lesson workshop?",
        answer:
          "**Study Hub → Workshop Creator** builds a structured, multi-lesson course from your scoped documents — an outline plus lessons you work through one at a time, finishing with a final quiz.",
      },
      {
        icon: Layers,
        label: "Flashcards",
        question: "How do flashcards work?",
        answer:
          "**Study Hub → Flashcards** generates a deck from your documents. Flip each card, mark it **Mastered** or **For review**, and your progress is saved per deck.",
      },
      {
        icon: Network,
        label: "Mindmaps",
        question: "How do I create and export a mindmap?",
        answer:
          "**Study Hub → Mindmaps** turns your documents into an interactive node map. **Drag nodes** to rearrange, switch **Left-right / Top-down** layout, and export as **Markdown, PNG, or PDF**.",
      },
    ],
  },
  {
    title: "Progress & data",
    topics: [
      {
        icon: BarChart3,
        label: "Activity dashboard",
        question: "Where do I see my activity and time?",
        answer:
          "The **Dashboard** shows your total time, sessions, current and best streak, a per-area breakdown, and a daily activity **heatmap**. Click any day in the heatmap for that day's details.",
      },
      {
        icon: Trophy,
        label: "Achievements",
        question: "What achievements can I unlock?",
        answer:
          "Badges unlock automatically as you use the app — first question, daily streaks, quizzes, decks, mindmaps, and more. Find them in the Dashboard's **Achievements** grid; click a badge to see your progress toward it.",
      },
      {
        icon: Download,
        label: "Exporting",
        question: "How do I export my work?",
        answer:
          "Quizzes export to **Markdown** or **PDF**; mindmaps export to **Markdown, PNG, or PDF** (buttons on each screen). Individual chat answers can be exported to Markdown too.",
      },
      {
        icon: ShieldCheck,
        label: "Privacy & storage",
        question: "Where is my data stored?",
        answer:
          "**Everything stays on your machine.** Your documents, the search index, chat history, and progress are all local files. Nothing is sent to any third-party AI service — the model runs locally.",
      },
    ],
  },
];

export const HELP_TOPICS: HelpTopic[] = HELP_GROUPS.flatMap((g) => g.topics);
