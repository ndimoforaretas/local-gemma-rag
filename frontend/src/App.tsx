import { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { KnowledgeBase } from "./components/KnowledgeBase";
import { KnowledgeSync } from "./components/KnowledgeSync";
import { Moon, Sun } from "lucide-react";

function App() {
  const [activeView, setActiveView] = useState<"chat" | "sync">("chat");
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  return (
    <div className="flex w-full h-screen overflow-hidden bg-[#f7f9fb] dark:bg-[#10131a] text-[#191c1e] dark:text-[#e1e2ec] transition-colors duration-300">
      <div className="flex w-full h-full relative z-10 overflow-hidden">
        <Sidebar activeView={activeView} setActiveView={setActiveView} />

        <main className="flex-1 flex flex-col relative bg-[#f7f9fb] dark:bg-[#10131a] transition-colors duration-300">
          {/* Header: utility controls only. View titles are rendered by each page. */}
          <header className="px-8 py-4 flex items-center justify-between border-b border-[#c2c6d6] dark:border-[#424754] bg-[#eceef0] dark:bg-[#1d2027] transition-colors duration-300">
            <div className="flex items-center gap-3 flex-1">
              <span className="inline-flex items-center rounded-full border border-[#c2c6d6] dark:border-[#424754] bg-white dark:bg-[#272a31] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#424754] dark:text-[#c2c6d6]">
                Local Workspace
              </span>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsDark(!isDark)}
                aria-label={
                  isDark ? "Switch to light mode" : "Switch to dark mode"
                }
                className="p-2 rounded-xl border transition-colors bg-[#e0e3e5] border-[#c2c6d6] text-[#424754] hover:text-[#191c1e] dark:bg-[#272a31] dark:border-[#424754] dark:text-[#c2c6d6] dark:hover:text-[#e1e2ec]">
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              <div className="flex items-center gap-3 px-3 py-1.5 rounded-full border bg-white border-[#c2c6d6] dark:bg-[#272a31] dark:border-[#424754] transition-colors duration-300">
                <div className="w-8 h-8 rounded-full bg-[#d0e1fb] text-[#0058be] dark:bg-[#32353c] dark:text-[#adc6ff] flex items-center justify-center font-bold text-sm">
                  U
                </div>
                <div className="flex flex-col pr-2">
                  <span className="text-xs font-medium text-[#191c1e] dark:text-[#e1e2ec]">
                    Local User
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-500 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>
                    Online
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-hidden relative">
            {activeView === "chat" ? <KnowledgeBase /> : <KnowledgeSync />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
