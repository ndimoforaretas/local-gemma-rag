/**
 * Attachment validation and MIME-type inference utilities for the chat
 * composer. Shared between ChatInput and any future upload surfaces.
 */

export const MAX_ATTACHMENTS = 5;
export const MAX_IMAGE_SIZE_MB = 10;
export const MAX_DOC_SIZE_MB = 20;  // PDFs and DOCX can be larger
export const MAX_TEXT_SIZE_MB = 5;

export const TEXT_MIME_TYPES = new Set([
  "application/json", "application/xml", "application/yaml",
  "application/x-yaml", "application/javascript", "application/typescript", "application/csv",
]);

export const TEXT_FILE_EXTENSIONS = new Set([
  ".txt", ".md", ".markdown", ".csv", ".json", ".xml",
  ".yaml", ".yml", ".log", ".py", ".js", ".ts", ".tsx", ".jsx", ".sql",
]);

export const PDF_MIME = "application/pdf";
export const DOCX_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/docx",
]);

export type AttachmentKind = "image" | "pdf" | "docx" | "text" | "unknown";

export function getFileExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx >= 0 ? filename.slice(idx).toLowerCase() : "";
}

export function inferMimeType(file: File): string {
  const raw = file.type?.trim().toLowerCase();
  if (raw) return raw;
  const ext = getFileExtension(file.name);
  const byExt: Record<string, string> = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".md": "text/markdown", ".markdown": "text/markdown",
    ".csv": "text/csv", ".json": "application/json", ".xml": "application/xml",
    ".yaml": "application/yaml", ".yml": "application/x-yaml",
    ".log": "text/plain", ".txt": "text/plain",
    ".py": "text/x-python", ".js": "application/javascript",
    ".ts": "application/typescript", ".tsx": "application/typescript",
    ".jsx": "application/javascript", ".sql": "text/plain",
  };
  return byExt[ext] ?? "application/octet-stream";
}

export function classifyFile(file: { name: string }, mimeType: string): AttachmentKind {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === PDF_MIME || getFileExtension(file.name) === ".pdf") return "pdf";
  if (DOCX_MIME_TYPES.has(mimeType) || getFileExtension(file.name) === ".docx") return "docx";
  if (mimeType.startsWith("text/") || TEXT_MIME_TYPES.has(mimeType)) return "text";
  if (TEXT_FILE_EXTENSIONS.has(getFileExtension(file.name))) return "text";
  return "unknown";
}

export function maxMbForKind(kind: AttachmentKind): number {
  if (kind === "image") return MAX_IMAGE_SIZE_MB;
  if (kind === "pdf" || kind === "docx") return MAX_DOC_SIZE_MB;
  return MAX_TEXT_SIZE_MB;
}
