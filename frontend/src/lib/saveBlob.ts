/**
 * Save a Blob to disk via the most native experience the browser supports.
 *
 * Strategy:
 *  1. Try `window.showSaveFilePicker` (the File System Access API) — opens a
 *     real OS-level "Save As…" dialog where the user can rename the file and
 *     pick any folder on their machine. Chromium-based browsers (Chrome,
 *     Edge, Brave, Opera) support it.
 *  2. Fallback: the classic `<a download>` trick — file lands in the user's
 *     default Downloads folder with the suggested filename. Works everywhere.
 *
 * A user cancellation in the picker is silently swallowed (no error noise).
 * Any other picker failure quietly falls through to the legacy download so
 * the user never loses their file.
 */

interface SaveFileOptions {
  description: string;   // e.g. "Markdown file"
  mimeType: string;      // e.g. "text/markdown"
  extension: string;     // e.g. "md" (no leading dot)
}

export async function saveBlob(
  blob: Blob,
  suggestedName: string,
  opts: SaveFileOptions,
): Promise<void> {
  const w = window as unknown as {
    showSaveFilePicker?: (options: {
      suggestedName?: string;
      types?: {
        description?: string;
        accept: Record<string, string[]>;
      }[];
    }) => Promise<{
      createWritable: () => Promise<{
        write: (data: Blob) => Promise<void>;
        close: () => Promise<void>;
      }>;
    }>;
  };

  if (typeof w.showSaveFilePicker === "function") {
    try {
      const handle = await w.showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: opts.description,
            accept: { [opts.mimeType]: [`.${opts.extension}`] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err) {
      if ((err as DOMException).name === "AbortError") return;
      // Other errors → fall through to legacy download.
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = suggestedName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
