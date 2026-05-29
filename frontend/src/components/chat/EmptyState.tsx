import { SuggestionCards } from "../SuggestionCards";

interface EmptyStateProps {
  onSuggestionSelect: (prompt: string, scope?: string[]) => void;
}

export function EmptyState({ onSuggestionSelect }: EmptyStateProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center">
      <div className="flex flex-col items-center">
        <img
          src="/mark.svg"
          alt="CogniVault"
          className="w-20 h-20 mb-6 drop-shadow-[0_4px_20px_rgba(167,139,250,0.4)] opacity-90"
        />
        <h3 className="text-2xl font-semibold mb-3 text-[#191c1e] dark:text-[#e1e2ec]">
          Welcome to Gemma CogniVault
        </h3>
        <p className="text-base text-[#424754] dark:text-[#8c909f] text-center max-w-sm leading-relaxed">
          Upload documents to your{" "}
          <span className="font-medium text-[#191c1e] dark:text-[#e1e2ec]">
            Knowledge Base
          </span>{" "}
          and ask questions about them — or tap a card below to explore what the app can do.
        </p>
      </div>
      <SuggestionCards onSelect={onSuggestionSelect} />
    </div>
  );
}
