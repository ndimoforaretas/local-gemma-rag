/**
 * Streaming primitives and the core stream-consumption loop for the /rag
 * NDJSON protocol.
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

// ── Stream consumption ────────────────────────────────────────────────────────

export interface StreamCallbacks {
  onThinking: (text: string) => void;
  onText: (text: string) => void;
  onMetadata: (meta: MetadataPayload) => void;
}

/**
 * Consume a /rag streaming response from `reader` to completion, dispatching
 * each decoded event to the supplied `callbacks`. Handles NDJSON, plain-text,
 * and SSE fallback formats, plus per-chunk read timeouts with retry logic.
 *
 * Throws on unrecoverable errors (e.g. network failure before any text landed).
 * Callers should wrap in try/catch and surface an error message.
 */
export async function consumeRagStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  callbacks: StreamCallbacks,
): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = "";
  let streamMode: StreamMode = "unknown";
  let hasReceivedChunk = false;
  let timeoutRetries = 0;
  let accumulatedText = "";

  const processNdjsonLine = (line: string): boolean => {
    const event = parseNdjsonLine(line);
    if (!event) return false;
    if (event.type === "thinking" && event.data) {
      callbacks.onThinking(String(event.data));
    } else if (event.type === "text" && event.data) {
      accumulatedText += String(event.data);
      callbacks.onText(String(event.data));
    } else if (event.type === "metadata" && event.data) {
      callbacks.onMetadata(event.data as MetadataPayload);
    } else if (event.type === "error") {
      console.error("RAG error:", event.data);
    }
    return true;
  };

  while (true) {
    let done = false;
    let value: Uint8Array | undefined;

    try {
      const result = await readChunkWithTimeout(
        reader,
        hasReceivedChunk ? STREAM_IDLE_TIMEOUT_MS : FIRST_CHUNK_TIMEOUT_MS,
      );
      done = result.done;
      value = result.value;
      timeoutRetries = 0;
    } catch (err) {
      const isTimeout =
        err instanceof Error && err.message.includes("Stream read timeout");
      if (isTimeout && timeoutRetries < MAX_TIMEOUT_RETRIES) {
        timeoutRetries += 1;
        continue;
      }
      // If we already have useful text, end gracefully instead of throwing.
      if (accumulatedText.trim()) {
        await reader.cancel().catch(() => undefined);
        return;
      }
      throw err;
    }

    if (done) {
      const tail = buffer.trim();
      if (tail) {
        if (streamMode === "ndjson") {
          if (!processNdjsonLine(tail)) {
            callbacks.onText(normalizeSseText(tail));
          }
        } else {
          callbacks.onText(normalizeSseText(buffer));
        }
      }
      return;
    }

    hasReceivedChunk = true;
    const chunk = decoder.decode(value, { stream: true });

    if (streamMode === "plain") {
      callbacks.onText(normalizeSseText(chunk));
      continue;
    }

    buffer += chunk;

    if (streamMode === "unknown") {
      const probe = buffer.trimStart();
      if (probe && !probe.startsWith("{")) {
        streamMode = "plain";
        callbacks.onText(normalizeSseText(buffer));
        buffer = "";
        continue;
      }
    }

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (processNdjsonLine(trimmed)) {
        streamMode = "ndjson";
        continue;
      }

      if (streamMode === "unknown" || streamMode === "plain") {
        streamMode = "plain";
        callbacks.onText(normalizeSseText(trimmed + "\n"));
      } else {
        console.error("Failed to parse NDJSON line:", line);
      }
    }
  }
}

// ── Text cleanup ──────────────────────────────────────────────────────────────

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
