import { useState, useEffect, lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { Sidebar, type AppView } from "./components/Sidebar";

// Lazy-load each top-level view so the initial JS bundle only contains
// the shell + the first view the user lands on.  Vite turns each of
// these dynamic imports into its own chunk.
const KnowledgeBase = lazy(() =>
  import("./components/KnowledgeBase").then((m) => ({ default: m.KnowledgeBase })),
);
const KnowledgeSync = lazy(() =>
  import("./components/KnowledgeSync").then((m) => ({ default: m.KnowledgeSync })),
);
const StudyHub = lazy(() =>
  import("./components/study/StudyHub").then((m) => ({ default: m.StudyHub })),
);

function ViewLoader() {
  return (
    <div className="h-full w-full flex items-center justify-center text-[#727785] dark:text-[#8c909f]">
      <Loader2 className="animate-spin" size={20} />
    </div>
  );
}

function App() {
  const [activeView, setActiveView] = useState<AppView>("chat");
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
            <Suspense fallback={<ViewLoader />}>
              {activeView === "chat" && <KnowledgeBase />}
              {activeView === "sync" && <KnowledgeSync />}
              {activeView === "study" && <StudyHub />}
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
