import { MessageSquare, Database, GraduationCap, Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";

export type AppView = "chat" | "sync" | "study";

interface SidebarProps {
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  isDark: boolean;
  onToggleDark: () => void;
}

export function Sidebar({ activeView, setActiveView, isDark, onToggleDark }: SidebarProps) {
  const navItems = [
    { id: "chat", label: "Chat", icon: MessageSquare },
    { id: "sync", label: "Knowledge Base", icon: Database },
    { id: "study", label: "Study Hub", icon: GraduationCap },
  ] as const;

  return (
    /* Dark: surface-container-low #191b23 | Light: #f2f4f6 */
    <div className="w-64 bg-[#f2f4f6] dark:bg-[#191b23] border-r border-[#c2c6d6] dark:border-[#424754] p-6 flex flex-col gap-8 transition-colors duration-300">
      {/* Logo */}
      <div className="flex items-center gap-3 px-2">
        <img
          src="/mark.svg"
          alt="CogniVault mark"
          className="w-9 h-9 drop-shadow-[0_2px_8px_rgba(167,139,250,0.35)]"
        />
        <h1 className="text-xl font-bold tracking-tight text-[#191c1e] dark:text-[#e1e2ec]">
          Gemma CogniVault
        </h1>
      </div>

      {/* Navigation */}
      <nav
        className="flex flex-col gap-1 flex-1"
        aria-label="Primary navigation">
        <div className="text-xs uppercase tracking-wider text-[#727785] dark:text-[#8c909f] font-semibold mb-2 px-3">
          Menu
        </div>

        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveView(id as AppView)}
            aria-current={activeView === id ? "page" : undefined}
            className={`
              relative flex items-center gap-3 px-3 py-3 rounded-xl text-base font-medium transition-all duration-200
              ${
                activeView === id
                  ? "text-[#191c1e] dark:text-[#e1e2ec]"
                  : "text-[#424754] dark:text-[#c2c6d6] hover:text-[#191c1e] dark:hover:text-[#e1e2ec] hover:bg-[#e0e3e5] dark:hover:bg-[#272a31]"
              }
            `}>
            {activeView === id && (
              <motion.div
                layoutId="activeNavBackground"
                /* Active bg: surface-container-high with purple left-border feel */
                className="absolute inset-0 bg-[#e0e3e5] dark:bg-[#272a31] border border-[#c2c6d6] dark:border-[#424754] rounded-xl -z-10"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <Icon
              size={18}
              className={activeView === id ? "text-[#a855f7]" : ""}
            />
            {label}
          </button>
        ))}
      </nav>

      {/* Bottom: user chip + theme toggle */}
      <div className="flex flex-col gap-3">
        <div className="h-px bg-[#c2c6d6] dark:bg-[#424754]" />
        <div className="flex items-center gap-2 px-1">
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-[#d0e1fb] text-[#0058be] dark:bg-[#32353c] dark:text-[#adc6ff] flex items-center justify-center font-bold text-sm shrink-0">
            U
          </div>

          {/* Name + status */}
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-medium text-[#191c1e] dark:text-[#e1e2ec] truncate leading-tight">
              Local User
            </span>
            <div className="flex items-center gap-1 text-[10px] text-emerald-500 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0" />
              Online
            </div>
          </div>

          {/* Theme toggle */}
          <button
            onClick={onToggleDark}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className="p-1.5 rounded-lg border transition-colors shrink-0 bg-[#e0e3e5] border-[#c2c6d6] text-[#424754] hover:text-[#191c1e] dark:bg-[#272a31] dark:border-[#424754] dark:text-[#c2c6d6] dark:hover:text-[#e1e2ec]">
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </div>
    </div>
  );
}
