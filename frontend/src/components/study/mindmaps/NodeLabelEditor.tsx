/**
 * Inline label editor inside a mindmap node — text pre-selected on focus,
 * Enter/blur commits, Esc cancels.
 */

import { useState } from "react";

export function NodeLabelEditor({
  initial,
  onCommit,
  onCancel,
}: {
  initial: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={() => onCommit(draft)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") onCommit(draft);
        else if (e.key === "Escape") onCancel();
      }}
      className="nodrag nopan w-full min-w-[120px] bg-transparent text-center outline-none"
    />
  );
}
