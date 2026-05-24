/**
 * Streaming primitives for the /rag NDJSON protocol.
 *
 * The backend may emit one of two stream shapes:
 *  - **NDJSON** (current default): one JSON event per line with a `type` of
 *    "thinking" | "text" | "metadata" | "error".
 *  - **plain / SSE** (legacy fallback): raw text or `data:`-prefixed SSE lines.
 *
 * These helpers handle both without bloating the React component that
 * consumes them.
 */

// Multimodal requests (image + multiple files) can take 60–90 s for the
// Strands agent to start emitting tokens after Phase 1 thinking.
export const FIRST_CHUNK_TIMEOUT_MS = 90000;
export const STREAM_IDLE_TIMEOUT_MS = 30000;
export const MAX_TIMEOUT_RETRIES = 2;

export type StreamMode = "unknown" | "ndjson" | "plain";

export interface RagStreamEvent {
  type: "thinking" | "text" | "metadata" | "error";
  data: unknown;
}

export interface MetadataPayload {
  source: string;
  type: string;
  content?: string;
  text?: string;
  page?: number;
}

/** Parse a single NDJSON line, or return null if it isn't valid JSON. */
export function parseNdjsonLine(line: string): RagStreamEvent | null {
  try {
    return JSON.parse(line) as RagStreamEvent;
  } catch {
    return null;
  }
}

/** Strip `data:` SSE prefixes if present; otherwise pass through. */
export function normalizeSseText(raw: string): string {
  if (!raw.includes("data:")) return raw;
  return raw
    .split("\n")
    .map((line) => (line.startsWith("data:") ? line.slice(5).trimStart() : ""))
    .join("\n");
}

/**
 * Read the next chunk from a stream reader with a hard timeout. Rejects with
 * "Stream read timeout" if the timer fires first.
 */
export async function readChunkWithTimeout(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  timeoutMs: number,
): Promise<ReadableStreamReadResult<Uint8Array>> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      reader.read(),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error("Stream read timeout"));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/**
 * Clean up assistant text by:
 *  1. Re-joining words the model split across `<think>` boundaries
 *     (e.g. `"<think>Float</think>ing"` → `"Floating"`).
 *  2. Stripping any remaining `<think>…</think>` blocks wholesale.
 *  3. Trimming leading whitespace and capitalising the first character.
 *
 * Gemma 4 occasionally leaks `<think>` tags into the answer stream even when
 * `thinking` is disabled in Phase 2.
 */
export function cleanAssistantText(fullText: string): string {
  const stripped = fullText
    .replace(/<think>(\S+)<\/think>(\S)/gi, (_, inner, next) => inner + next)
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trimStart();
  return stripped.length > 0
    ? stripped.charAt(0).toUpperCase() + stripped.slice(1)
    : stripped;
}
