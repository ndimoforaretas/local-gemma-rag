/**
 * Top bar of the chat view: branding + active session title, sources badge,
 * "New Chat" button, and the history sidebar toggle.
 */

import { History, Plus } from "lucide-react";
import { Tooltip } from "../Tooltip";

export interface ChatHeaderBarProps {
  sessionTitle: string;
  contextCount: number;
  isHistoryOpen: boolean;
  onOpenContextDrawer: () => void;
  onToggleHistory: () => void;
  onNewChat: () => void;
}

export function ChatHeaderBar(p: ChatHeaderBarProps) {
  const { contextCount } = p;
  return (
    <div className="flex flex-col gap-3 sm:gap-2 sm:flex-row sm:items-center sm:justify-between bg-[#eceef0] dark:bg-[#1d2027] border border-[#c2c6d6] dark:border-[#424754] rounded-2xl p-3 sm:p-4 shrink-0">
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <img
          src="/mark.svg"
          alt="CogniVault"
          className="w-11 h-11 drop-shadow-[0_2px_10px_rgba(167,139,250,0.3)] shrink-0"
        />
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-[#191c1e] dark:text-[#e1e2ec] tracking-tight truncate">
            Gemma CogniVault AI
          </h2>
          <p className="text-xs sm:text-sm text-[#424754] dark:text-[#8c909f] font-medium truncate">
            {p.sessionTitle}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 sm:pr-2 flex-wrap">
        {contextCount > 0 && (
          <>
            <button
              type="button"
              onClick={p.onOpenContextDrawer}
              className="lg:hidden text-xs font-medium px-2 py-1 rounded-full bg-[#d0e1fb] dark:bg-[#32353c] text-[#0058be] dark:text-[#adc6ff] hover:bg-[#adc6ff]/30 transition-colors"
              aria-label={`View ${contextCount} source${contextCount !== 1 ? "s" : ""}`}
            >
              {contextCount} sources ↗
            </button>
            <span className="hidden lg:inline-flex text-xs font-medium px-2 py-1 rounded-full bg-[#d0e1fb] dark:bg-[#32353c] text-[#0058be] dark:text-[#adc6ff]">
              {contextCount} source{contextCount !== 1 ? "s" : ""}
            </span>
          </>
        )}
        <Tooltip content="Start a fresh conversation" position="bottom">
          <button
            onClick={p.onNewChat}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-[#e0e3e5] hover:bg-[#c2c6d6] dark:bg-[#272a31] dark:hover:bg-[#32353c] text-[#191c1e] dark:text-[#c2c6d6] text-sm font-medium transition-colors"
          >
            <Plus size={18} /> New Chat
          </button>
        </Tooltip>
        <Tooltip
          content={p.isHistoryOpen ? "Hide chat history" : "Browse past sessions"}
          position="bottom"
        >
          <button
            onClick={p.onToggleHistory}
            className={`hidden sm:inline-flex p-2.5 rounded-xl transition-colors ${p.isHistoryOpen ? "bg-[#a855f7] text-white shadow-[0_0_16px_rgba(168,85,247,0.4)]" : "bg-[#e0e3e5] hover:bg-[#c2c6d6] dark:bg-[#272a31] dark:hover:bg-[#32353c] text-[#191c1e] dark:text-[#c2c6d6]"}`}
          >
            <History size={20} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
