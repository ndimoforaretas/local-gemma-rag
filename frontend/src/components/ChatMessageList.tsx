import { motion, AnimatePresence } from "framer-motion";
import { Bot, User, Copy, Check, Download } from "lucide-react";
import { marked } from "marked";
import { Tooltip } from "./Tooltip";
import type { Message } from "../types/api";

marked.setOptions({
  gfm: true,
  breaks: true,
});

function isLikelyNumericCell(value: string): boolean {
  const normalized = value.replace(/\u00a0/g, " ").trim();
  if (!normalized) {
    return false;
  }

  const compact = normalized
    .replace(/^[\s$€£¥₹]+/, "")
    .replace(/[,%\s$€£¥₹()]/g, "")
    .replace(/,/g, "");

  return /^[-+]?\d*\.?\d+$/.test(compact);
}

function addNumericColumnClasses(html: string): string {
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return html;
  }

  const doc = new DOMParser().parseFromString(html, "text/html");
  const tables = doc.querySelectorAll("table");

  tables.forEach((table) => {
    const allRows = Array.from(table.querySelectorAll("tr"));
    if (allRows.length < 2) {
      return;
    }

    const bodyRows = Array.from(table.querySelectorAll("tbody tr"));
    const sampleRows = bodyRows.length > 0 ? bodyRows : allRows.slice(1);
    const maxCols = allRows.reduce(
      (max, row) => Math.max(max, row.children.length),
      0,
    );

    for (let col = 0; col < maxCols; col += 1) {
      let numericCount = 0;
      let checkedCount = 0;

      sampleRows.forEach((row) => {
        const cell = row.children[col] as HTMLElement | undefined;
        if (!cell) {
          return;
        }

        const text = cell.textContent?.trim() ?? "";
        if (!text) {
          return;
        }

        checkedCount += 1;
        if (isLikelyNumericCell(text)) {
          numericCount += 1;
        }
      });

      if (checkedCount > 0 && numericCount / checkedCount >= 0.75) {
        allRows.forEach((row) => {
          const cell = row.children[col] as HTMLElement | undefined;
          if (cell) {
            cell.classList.add("is-numeric-column");
          }
        });
      }
    }
  });

  return doc.body.innerHTML;
}

interface ChatMessageListProps {
  messages: Message[];
  isLoading: boolean;
  copiedId: string | null;
  onCopy: (content: string, id: string) => void;
  onExport: (content: string, id: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

function formatMessageTime(id: string): string {
  const raw = id.split("-")[0];
  const ts = Number(raw);
  if (!Number.isFinite(ts)) {
    return "";
  }

  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ChatMessageList({
  messages,
  isLoading,
  copiedId,
  onCopy,
  onExport,
  messagesEndRef,
}: ChatMessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto rounded-2xl bg-[#f2f4f6] dark:bg-[#191b23] border border-[#c2c6d6] dark:border-[#424754] p-6 transition-colors duration-300 relative">
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center opacity-60">
          <div className="w-16 h-16 rounded-2xl bg-[#d0e1fb] dark:bg-[#32353c] border border-[#c2c6d6] dark:border-[#424754] flex items-center justify-center mb-6">
            <Bot size={32} className="text-[#0058be] dark:text-[#adc6ff]" />
          </div>
          <h3 className="text-2xl font-semibold mb-2 text-[#191c1e] dark:text-[#e1e2ec]">
            How can I assist you today?
          </h3>
          <p className="text-base text-[#424754] dark:text-[#8c909f] text-center max-w-sm">
            Ask me anything about your uploaded documents. I will search the
            knowledge base and synthesize an answer.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1
                  ${
                    msg.role === "user"
                      ? "bg-[#a855f7] text-white"
                      : "bg-[#d0e1fb] text-[#0058be] border border-[#c2c6d6] dark:bg-[#32353c] dark:text-[#adc6ff] dark:border-[#424754]"
                  }`}>
                  {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
                </div>

                {/* Bubble Container */}
                <div
                  className={`flex flex-col gap-2 ${msg.role === "user" ? "max-w-[82%] items-end" : "w-full max-w-[min(100%,74ch)] items-start"}`}>
                  <div
                    className={`flex items-center gap-2 text-[11px] font-medium ${msg.role === "user" ? "text-[#6f4ab3] dark:text-[#cba6ff]" : "text-[#727785] dark:text-[#8c909f]"}`}>
                    <span>
                      {msg.role === "user" ? "You" : "Gemma CogniVault AI"}
                    </span>
                    {formatMessageTime(msg.id) && (
                      <span className="opacity-70">
                        {formatMessageTime(msg.id)}
                      </span>
                    )}
                  </div>
                  <div
                    className={`rounded-2xl p-5 text-base leading-relaxed
                    ${
                      msg.role === "user"
                        ? "w-fit bg-[#a855f7] text-white rounded-tr-sm shadow-[0_4px_20px_rgba(168,85,247,0.3)]"
                        : "w-full bg-white text-[#191c1e] border border-[#c2c6d6] dark:bg-[#1d2027] dark:text-[#e1e2ec] dark:border-[#424754] rounded-tl-sm"
                    }`}>
                    {msg.role === "ai" && !msg.content && isLoading ? (
                      <div className="flex items-center gap-2 min-h-6">
                        <motion.div
                          className="w-2 h-2 rounded-full bg-[#a855f7]"
                          animate={{ y: [0, -5, 0] }}
                          transition={{
                            repeat: Infinity,
                            duration: 0.6,
                            delay: 0,
                          }}
                        />
                        <motion.div
                          className="w-2 h-2 rounded-full bg-[#a855f7]"
                          animate={{ y: [0, -5, 0] }}
                          transition={{
                            repeat: Infinity,
                            duration: 0.6,
                            delay: 0.1,
                          }}
                        />
                        <motion.div
                          className="w-2 h-2 rounded-full bg-[#a855f7]"
                          animate={{ y: [0, -5, 0] }}
                          transition={{
                            repeat: Infinity,
                            duration: 0.6,
                            delay: 0.2,
                          }}
                        />
                        <span className="text-sm text-[#727785] dark:text-[#8c909f]">
                          Generating answer...
                        </span>
                      </div>
                    ) : msg.role === "ai" ? (
                      <div
                        className="ai-response prose prose-slate dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: addNumericColumnClasses(
                            marked.parse(msg.content) as string,
                          ),
                        }}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap break-words leading-relaxed">
                        {msg.content}
                      </p>
                    )}
                  </div>

                  {/* AI Actions */}
                  {msg.role === "ai" && msg.content && (
                    <div className="flex items-center gap-4 mt-1 self-start">
                      <Tooltip
                        content={
                          copiedId === msg.id
                            ? "Copied to clipboard!"
                            : "Copy response to clipboard"
                        }
                        position="top">
                        <button
                          onClick={() => onCopy(msg.content, msg.id)}
                          className="flex items-center gap-1.5 text-xs font-medium text-[#727785] dark:text-[#8c909f] hover:text-[#191c1e] dark:hover:text-[#e1e2ec] transition-colors">
                          {copiedId === msg.id ? (
                            <Check size={14} className="text-emerald-500" />
                          ) : (
                            <Copy size={14} />
                          )}
                          {copiedId === msg.id ? "Copied" : "Copy"}
                        </button>
                      </Tooltip>
                      <Tooltip
                        content="Export this response as a Markdown file"
                        position="top">
                        <button
                          onClick={() => onExport(msg.content, msg.id)}
                          className="flex items-center gap-1.5 text-xs font-medium text-[#727785] dark:text-[#8c909f] hover:text-[#0058be] dark:hover:text-[#adc6ff] transition-colors">
                          <Download size={14} /> Export
                        </button>
                      </Tooltip>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
}
