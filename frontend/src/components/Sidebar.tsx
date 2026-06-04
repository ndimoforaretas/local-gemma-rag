import {
  Home as HomeIcon,
  MessageSquare,
  Database,
  GraduationCap,
  BarChart3,
  Sun,
  Moon,
  Plus,
  History,
  PanelLeftClose,
  PanelLeftOpen,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Tooltip } from "./Tooltip";
import { useChatChrome } from "./ChatChromeContext";

export type AppView = "home" | "chat" | "sync" | "study" | "dashboard" | "help";

interface SidebarProps {
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  isDark: boolean;
  onToggleDark: () => void;
}

const COLLAPSE_KEY = "sidebar-collapsed";

const NAV_ITEMS: { id: AppView; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "Home", icon: HomeIcon },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "sync", label: "Knowledge Base", icon: Database },
  { id: "study", label: "Study Hub", icon: GraduationCap },
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "help", label: "Help", icon: LifeBuoy },
];

export function Sidebar({ activeView, setActiveView, isDark, onToggleDark }: SidebarProps) {
  const chrome = useChatChrome();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  return (
    <div
      className={`${
        collapsed ? "w-20 px-2" : "w-64 px-6"
      } py-6 bg-[#f2f4f6] dark:bg-[#191b23] border-r border-[#c2c6d6] dark:border-[#424754] flex flex-col gap-6 transition-all duration-300`}
    >
      {/* Collapse toggle sits ABOVE the brand so it never crowds the name. */}
      <div className="flex flex-col gap-2">
        <div className={`flex ${collapsed ? "justify-center" : "justify-end"}`}>
          <Tooltip content={collapsed ? "Expand sidebar" : "Collapse sidebar"} position="right">
            <button
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="p-1.5 rounded-lg text-ink-muted hover:text-ink-strong hover:bg-[#e0e3e5] dark:hover:bg-[#272a31] transition-colors"
            >
              {collapsed ? <PanelLeftOpen size={24} /> : <PanelLeftClose size={24} />}
            </button>
          </Tooltip>
        </div>
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-2.5 px-1"}`}>
          <img
            src="/mark.svg"
            alt="CogniVault mark"
            className="w-9 h-9 shrink-0 drop-shadow-[0_2px_8px_rgba(167,139,250,0.35)]"
          />
          {!collapsed && (
            <h1 className="text-base font-bold tracking-tight text-ink-strong truncate">
              Gemma CogniVault
            </h1>
          )}
        </div>
      </div>

      {/* Chat actions — only while the Chat view is active. */}
      {activeView === "chat" && (
        <div className={`flex flex-col gap-2 ${collapsed ? "items-center" : ""}`}>
          <RailButton
            icon={Plus}
            label="New Chat"
            onClick={chrome.newChat}
            collapsed={collapsed}
            variant="primary"
          />
          <RailButton
            icon={History}
            label="Browse Past Sessions"
            onClick={chrome.toggleHistory}
            collapsed={collapsed}
            active={chrome.isHistoryOpen}
          />
        </div>
      )}

      {/* Navigation */}
      <nav
        className={`flex flex-col gap-1 flex-1 ${collapsed ? "items-center" : ""}`}
        aria-label="Primary navigation"
      >
        {!collapsed && (
          <div className="text-xs uppercase tracking-wider text-ink-muted font-semibold mb-2 px-3">
            Menu
          </div>
        )}
        {NAV_ITEMS.map(({ id, label, icon }) => (
          <NavItem
            key={id}
            icon={icon}
            label={label}
            active={activeView === id}
            collapsed={collapsed}
            onClick={() => setActiveView(id)}
          />
        ))}
      </nav>

      {/* Bottom: user chip + theme toggle */}
      <div className="flex flex-col gap-3">
        <div className="h-px bg-[#c2c6d6] dark:bg-[#424754]" />
        <div className={`flex items-center gap-2 ${collapsed ? "flex-col" : "px-1"}`}>
          <div className="w-8 h-8 rounded-full bg-[#d0e1fb] text-[#0058be] dark:bg-[#32353c] dark:text-[#adc6ff] flex items-center justify-center font-bold text-sm shrink-0">
            U
          </div>
          {!collapsed && (
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium text-ink-strong truncate leading-tight">
                Local User
              </span>
              <div className="flex items-center gap-1 text-xs text-emerald-500 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0" />
                Online
              </div>
            </div>
          )}
          <Tooltip content={isDark ? "Light mode" : "Dark mode"} position="right">
            <button
              onClick={onToggleDark}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className="p-1.5 rounded-lg border transition-colors shrink-0 bg-[#e0e3e5] border-[#c2c6d6] text-ink-muted hover:text-ink-strong dark:bg-[#272a31] dark:border-[#424754]"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

function NavItem({
  icon: Icon,
  label,
  active,
  collapsed,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  const btn = (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`relative flex items-center rounded-xl text-base transition-all duration-200 ${
        collapsed ? "w-11 h-11 justify-center" : "gap-3 px-3 py-3"
      } ${
        active
          ? "text-[#a855f7] dark:text-[#ddb7ff] font-semibold"
          : "text-ink-muted font-medium hover:text-ink-strong hover:bg-[#e0e3e5] dark:hover:bg-[#272a31]"
      }`}
    >
      {active && (
        <motion.div
          layoutId="activeNavBackground"
          className="absolute inset-0 bg-[#a855f7]/15 border border-[#a855f7]/40 rounded-xl -z-10"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
      <Icon size={22} className={active ? "text-[#a855f7] dark:text-[#ddb7ff]" : ""} />
      {!collapsed && label}
    </button>
  );
  return collapsed ? (
    <Tooltip content={label} position="right">
      {btn}
    </Tooltip>
  ) : (
    btn
  );
}

function RailButton({
  icon: Icon,
  label,
  onClick,
  collapsed,
  variant,
  active,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  collapsed: boolean;
  variant?: "primary";
  active?: boolean;
}) {
  const shape = collapsed ? "w-11 h-11 justify-center" : "gap-2.5 px-3 py-1.5";
  const tone =
    variant === "primary"
      ? "bg-[#a855f7] hover:bg-[#9333ea] text-white font-semibold"
      : active
        ? "bg-[#a855f7]/15 border border-[#a855f7]/40 text-[#a855f7] dark:text-[#ddb7ff] font-medium"
        : "text-ink-muted font-medium hover:text-ink-strong hover:bg-[#e0e3e5] dark:hover:bg-[#272a31]";
  const btn = (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center rounded-xl text-sm transition-colors ${shape} ${tone}`}
    >
      <Icon size={22} />
      {!collapsed && label}
    </button>
  );
  return collapsed ? (
    <Tooltip content={label} position="right">
      {btn}
    </Tooltip>
  ) : (
    btn
  );
}
