import { motion, AnimatePresence } from "framer-motion";
import { History, Loader2, Trash2 } from "lucide-react";
import type { ChatSession } from "../types/api";

interface HistorySidebarProps {
  isOpen: boolean;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  deletingSessionId: string | null;
}

function formatRecency(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();

  if (isToday) {
    return `Today, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }

  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export function HistorySidebar({
  isOpen,
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  deletingSessionId,
}: HistorySidebarProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          className="border-l border-[#c2c6d6] dark:border-[#424754] bg-[#f2f4f6] dark:bg-[#191b23] flex flex-col overflow-hidden transition-colors duration-300">
          <div className="p-6 border-b border-[#c2c6d6] dark:border-[#424754] flex items-center gap-2">
            <History size={16} className="text-[#0058be] dark:text-[#adc6ff]" />
            <div className="flex items-center justify-between w-full gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#727785] dark:text-[#8c909f]">
                Chat History
              </h3>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#e0e3e5] dark:bg-[#272a31] text-[#424754] dark:text-[#c2c6d6]">
                {sessions.length}
              </span>
            </div>
          </div>
          <div className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#727785] dark:text-[#8c909f]">
            Recent Sessions
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-2">
            {sessions.map((s) => (
              <div
                key={s.id}
                className={`p-2 rounded-xl transition-all border ${
                  activeSessionId === s.id
                    ? "bg-white dark:bg-[#272a31] border-[#a855f7] dark:border-[#a855f7]"
                    : "bg-transparent border-transparent hover:bg-[#e0e3e5] dark:hover:bg-[#272a31]"
                }`}>
                <div className="relative">
                  <button
                    onClick={() => onSelectSession(s.id)}
                    className="w-full p-2 pr-12 rounded-lg cursor-pointer text-left"
                    aria-current={
                      activeSessionId === s.id ? "true" : undefined
                    }>
                    <h4 className="font-medium text-[#191c1e] dark:text-[#e1e2ec] truncate">
                      {s.title}
                    </h4>
                    <div className="mt-1.5 flex items-center justify-between gap-3 text-xs text-[#727785] dark:text-[#8c909f]">
                      <p className="truncate">{formatRecency(s.updatedAt)}</p>
                      <span className="shrink-0">{s.messages.length} msgs</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteSession(s.id)}
                    disabled={deletingSessionId === s.id}
                    aria-label={`Delete session ${s.title}`}
                    title="Delete session"
                    className="absolute right-2 top-2 p-2 rounded-lg text-[#727785] hover:text-[#8b1d2c] hover:bg-[#f3d9dd] dark:text-[#8c909f] dark:hover:text-[#ffb4ab] dark:hover:bg-[#3b2129] transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                    {deletingSessionId === s.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              </div>
            ))}
            {sessions.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 opacity-50">
                <History size={24} className="mb-2 text-[#8c909f]" />
                <p className="text-sm text-center text-[#8c909f]">
                  No past sessions
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
