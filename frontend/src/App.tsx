import { useState, useEffect, lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { Sidebar, type AppView } from "./components/Sidebar";
import {
  isActiveStudyMode,
  type ActiveStudyMode,
} from "./components/study/studyModes";

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
const ProgressDashboard = lazy(() =>
  import("./components/dashboard/ProgressDashboard").then((m) => ({
    default: m.ProgressDashboard,
  })),
);

function ViewLoader() {
  return (
    <div className="h-full w-full flex items-center justify-center text-[#727785] dark:text-[#8c909f]">
      <Loader2 className="animate-spin" size={20} />
    </div>
  );
}

const VIEW_STORAGE_KEY = "cognivault.activeView";
const STUDY_MODE_STORAGE_KEY = "cognivault.studyMode";

function readSavedView(): AppView {
  // Restore last view across browser refreshes so the user lands where they were
  // (chat / knowledge base / study hub) rather than always snapping back to chat.
  if (typeof window === "undefined" || !window.localStorage) return "chat";
  try {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY);
    if (
      saved === "chat" ||
      saved === "sync" ||
      saved === "study" ||
      saved === "dashboard"
    )
      return saved;
  } catch {
    // ignore
  }
  return "chat";
}

function readSavedStudyMode(): ActiveStudyMode {
  if (typeof window === "undefined" || !window.localStorage) return "hub";
  try {
    const saved = localStorage.getItem(STUDY_MODE_STORAGE_KEY);
    if (isActiveStudyMode(saved)) return saved;
  } catch {
    // ignore
  }
  return "hub";
}

function App() {
  const [activeView, setActiveView] = useState<AppView>(readSavedView);
  const [studyMode, setStudyMode] = useState<ActiveStudyMode>(readSavedStudyMode);
  const [isDark, setIsDark] = useState(true);

  // Persist the active view whenever it changes.
  useEffect(() => {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, activeView);
    } catch {
      // ignore quota / private-mode errors
    }
  }, [activeView]);

  // Persist the active study mode so refresh lands the user back in the same
  // sub-page (e.g. Quiz Mode), not the mode picker.
  useEffect(() => {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      localStorage.setItem(STUDY_MODE_STORAGE_KEY, studyMode);
    } catch {
      // ignore
    }
  }, [studyMode]);

  /**
   * Sidebar navigation handler. Clicking the "Study Hub" item from anywhere
   * (including from inside a study mode) resets the mode picker — without
   * this, sidebar clicks would no-op when activeView is already "study"
   * because React only re-renders on actual state change.
   */
  const handleNavigate = (view: AppView) => {
    setActiveView(view);
    if (view === "study") setStudyMode("hub");
  };

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
          setActiveView={handleNavigate}
          isDark={isDark}
          onToggleDark={() => setIsDark(!isDark)}
        />

        <main className="flex-1 flex flex-col relative bg-[#f7f9fb] dark:bg-[#10131a] transition-colors duration-300">
          <div className="flex-1 overflow-hidden relative">
            <Suspense fallback={<ViewLoader />}>
              {activeView === "chat" && <KnowledgeBase />}
              {activeView === "sync" && <KnowledgeSync />}
              {activeView === "study" && (
                <StudyHub mode={studyMode} onChangeMode={setStudyMode} />
              )}
              {activeView === "dashboard" && <ProgressDashboard />}
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
