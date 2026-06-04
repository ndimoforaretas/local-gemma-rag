/**
 * Empty state for a fresh chat — a calm prompt plus a few hints about what you
 * can bring into a conversation (scope, attachments, voice). The full welcome
 * + section launcher lives on the Home screen.
 */

import { Filter, Paperclip, Mic, ArrowRight, type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  onOpenHelp: () => void;
}

const HINTS: { icon: LucideIcon; text: string }[] = [
  { icon: Filter, text: "Scope the chat to a category or specific files so answers stay on-topic." },
  { icon: Paperclip, text: "Attach documents or images right in the message box." },
  { icon: Mic, text: "Prefer talking? Tap the mic to dictate your question." },
];

export function EmptyState({ onOpenHelp }: EmptyStateProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-4">
      <img
        src="/mark.svg"
        alt="CogniVault"
        className="w-14 h-14 mb-5 drop-shadow-[0_4px_20px_rgba(167,139,250,0.4)] opacity-90"
      />
      <h3 className="text-xl font-bold text-ink-strong text-center">
        Ask anything about your documents
      </h3>
      <p className="text-sm text-ink-muted text-center max-w-sm mt-2 mb-7">
        Type a question below to get started. A few things you can do:
      </p>

      <div className="flex flex-col gap-3 w-full max-w-md">
        {HINTS.map(({ icon: Icon, text }) => (
          <div
            key={text}
            className="flex items-start gap-3 px-4 py-3 rounded-xl bg-white dark:bg-[#191b23] border border-[#c2c6d6] dark:border-[#424754]"
          >
            <span className="w-8 h-8 rounded-lg bg-[#a855f7]/10 text-[#a855f7] dark:text-[#ddb7ff] flex items-center justify-center shrink-0">
              <Icon size={17} />
            </span>
            <span className="text-sm text-ink leading-snug">{text}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onOpenHelp}
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#a855f7] dark:text-[#ddb7ff] hover:underline"
      >
        Browse all help <ArrowRight size={15} />
      </button>
    </div>
  );
}
