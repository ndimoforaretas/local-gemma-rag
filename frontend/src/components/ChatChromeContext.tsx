/**
 * ChatChromeContext — lets the global Sidebar drive chat-level chrome (New Chat,
 * Browse Past Sessions) without lifting all of KnowledgeBase's state up.
 *
 * KnowledgeBase registers its "new chat" handler and reads `isHistoryOpen`;
 * the Sidebar renders the buttons (only while the Chat view is active).
 */

import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface ChatChrome {
  /** Whether the history (past sessions) panel is open. */
  isHistoryOpen: boolean;
  setHistoryOpen: (v: boolean) => void;
  toggleHistory: () => void;
  /** Start a fresh chat (delegates to KnowledgeBase's registered handler). */
  newChat: () => void;
  /** KnowledgeBase calls this once to register its new-chat handler. */
  registerNewChat: (fn: () => void) => void;
}

const Ctx = createContext<ChatChrome | null>(null);

export function ChatChromeProvider({ children }: { children: ReactNode }) {
  const [isHistoryOpen, setHistoryOpen] = useState(false);
  const handlerRef = useRef<() => void>(() => {});

  const value = useMemo<ChatChrome>(
    () => ({
      isHistoryOpen,
      setHistoryOpen,
      toggleHistory: () => setHistoryOpen((o) => !o),
      newChat: () => handlerRef.current(),
      registerNewChat: (fn: () => void) => {
        handlerRef.current = fn;
      },
    }),
    [isHistoryOpen],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChatChrome(): ChatChrome {
  const v = useContext(Ctx);
  if (!v) throw new Error("useChatChrome must be used within ChatChromeProvider");
  return v;
}
