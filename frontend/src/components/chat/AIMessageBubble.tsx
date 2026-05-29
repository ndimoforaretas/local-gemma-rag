import { Check, Copy, Download, RefreshCw } from "lucide-react";
import { Tooltip } from "../Tooltip";
import { TypingIndicator } from "./TypingIndicator";
import { renderMarkdown } from "../../lib/markdownTable";

interface AIMessageBubbleProps {
  content: string;
  msgId: string;
  isLoading: boolean;
  copiedId: string | null;
  onCopy: (content: string, id: string) => void;
  onExport: (content: string, id: string) => void;
  onRegenerate?: (index: number) => void;
  msgIndex: number;
}

export function AIMessageBubble({
  content, msgId, isLoading, copiedId, onCopy, onExport, onRegenerate, msgIndex,
}: AIMessageBubbleProps) {
  const isCopied = copiedId === msgId;

  return (
    <>
      <div className="w-full bg-white text-[#191c1e] border border-[#c2c6d6] dark:bg-[#1d2027] dark:text-[#e1e2ec] dark:border-[#424754] rounded-2xl rounded-tl-sm p-5 text-base leading-relaxed">
        {!content && isLoading ? (
          <TypingIndicator />
        ) : (
          <div
            className="ai-response prose prose-slate dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        )}
      </div>

      {content && (
        <div className="flex items-center gap-4 mt-1 self-start">
          <Tooltip content={isCopied ? "Copied to clipboard!" : "Copy response to clipboard"} position="top">
            <button
              onClick={() => onCopy(content, msgId)}
              aria-label={isCopied ? "Response copied" : "Copy response"}
              className="flex items-center gap-1.5 text-xs font-medium text-[#727785] dark:text-[#8c909f] hover:text-[#191c1e] dark:hover:text-[#e1e2ec] transition-colors"
            >
              {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              {isCopied ? "Copied" : "Copy"}
            </button>
          </Tooltip>
          <Tooltip content="Export this response as a Markdown file" position="top">
            <button
              onClick={() => onExport(content, msgId)}
              aria-label="Export response as markdown"
              className="flex items-center gap-1.5 text-xs font-medium text-[#727785] dark:text-[#8c909f] hover:text-[#0058be] dark:hover:text-[#adc6ff] transition-colors"
            >
              <Download size={14} /> Export
            </button>
          </Tooltip>
          {onRegenerate && !isLoading && (
            <Tooltip content="Regenerate this response" position="top">
              <button
                onClick={() => onRegenerate(msgIndex)}
                aria-label="Regenerate response"
                className="flex items-center gap-1.5 text-xs font-medium text-[#727785] dark:text-[#8c909f] hover:text-[#a855f7] dark:hover:text-[#ddb7ff] transition-colors"
              >
                <RefreshCw size={14} /> Regenerate
              </button>
            </Tooltip>
          )}
        </div>
      )}
    </>
  );
}
