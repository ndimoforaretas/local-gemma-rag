import { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { KnowledgeBase } from "./components/KnowledgeBase";
import { KnowledgeSync } from "./components/KnowledgeSync";

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
        <Sidebar
          activeView={activeView}
          setActiveView={setActiveView}
          isDark={isDark}
          onToggleDark={() => setIsDark(!isDark)}
        />

        <main className="flex-1 flex flex-col relative bg-[#f7f9fb] dark:bg-[#10131a] transition-colors duration-300">
          <div className="flex-1 overflow-hidden relative">
            {activeView === "chat" ? <KnowledgeBase /> : <KnowledgeSync />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
