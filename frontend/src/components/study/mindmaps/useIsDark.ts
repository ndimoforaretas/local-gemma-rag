/**
 * useIsDark — tracks the app's light/dark theme by watching the `.dark` class
 * on <html> (App toggles it). Used to theme the mermaid diagram + its colours.
 */

import { useEffect, useState } from "react";

function readIsDark(): boolean {
  if (typeof document === "undefined") return true;
  return document.documentElement.classList.contains("dark");
}

export function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(readIsDark);

  useEffect(() => {
    const observer = new MutationObserver(() => setIsDark(readIsDark()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return isDark;
}
