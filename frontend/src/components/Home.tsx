/**
 * Home — the landing screen. A warm welcome plus four clickable cards that jump
 * straight into the app's main sections, a privacy reassurance, and a link to
 * the full Help guide.
 */

import { motion } from "framer-motion";
import {
  MessageSquare,
  Database,
  GraduationCap,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";
import type { AppView } from "./Sidebar";

const CARDS: { icon: LucideIcon; title: string; desc: string; view: AppView }[] = [
  { icon: MessageSquare, title: "Chat with your documents", desc: "Ask questions and get answers with citations.", view: "chat" },
  { icon: Database, title: "Build your library", desc: "Upload and organise your private documents.", view: "sync" },
  { icon: GraduationCap, title: "Create quizzes & mindmaps", desc: "Turn documents into quizzes, flashcards & mindmaps.", view: "study" },
  { icon: BarChart3, title: "Track your activity", desc: "Time spent, streaks, and achievements.", view: "dashboard" },
];

export function Home({ onNavigate }: { onNavigate: (view: AppView) => void }) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full px-6 sm:px-8 py-12 flex flex-col items-center">
        <img
          src="/mark.svg"
          alt="CogniVault"
          className="w-20 h-20 mb-6 drop-shadow-[0_4px_20px_rgba(167,139,250,0.4)]"
        />
        <h1 className="text-3xl sm:text-4xl font-bold text-ink-strong text-center">
          Welcome to Gemma CogniVault
        </h1>
        <p className="text-base text-ink-muted text-center max-w-md leading-relaxed mt-3">
          Your private AI companion for any documents. Pick where you'd like to
          start — every card below is clickable.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 w-full mt-10">
          {CARDS.map(({ icon: Icon, title, desc, view }, i) => (
            <motion.button
              key={view}
              type="button"
              onClick={() => onNavigate(view)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="group flex items-start gap-4 p-5 rounded-2xl text-left bg-white dark:bg-[#191b23] border border-[#c2c6d6] dark:border-[#424754] hover:border-[#a855f7]/60 hover:shadow-md hover:shadow-[#a855f7]/10 transition-all"
            >
              <span className="w-11 h-11 rounded-xl bg-[#a855f7]/10 text-[#a855f7] dark:text-[#ddb7ff] flex items-center justify-center shrink-0">
                <Icon size={22} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-1.5 text-base font-bold text-ink-strong">
                  {title}
                  <ArrowRight
                    size={16}
                    className="text-[#a855f7] dark:text-[#ddb7ff] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
                  />
                </span>
                <span className="block text-sm text-ink-muted mt-0.5">{desc}</span>
              </span>
            </motion.button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8">
          <span className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
            <ShieldCheck size={15} className="text-emerald-500" />
            100% local &amp; private — nothing leaves your machine.
          </span>
          <button
            type="button"
            onClick={() => onNavigate("help")}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#a855f7] dark:text-[#ddb7ff] hover:underline"
          >
            <LifeBuoy size={15} /> Browse all help
          </button>
        </div>
      </div>
    </div>
  );
}
