/**
 * useFileAttachments — manages the attachment list for the chat composer:
 * file-picker onChange, per-file validation, base64 encoding, and removal.
 */

import { useRef, useState } from "react";
import { classifyFile, inferMimeType, maxMbForKind, MAX_ATTACHMENTS } from "../../lib/attachmentUtils";
import type { Attachment } from "../../types/api";

interface UseFileAttachmentsArgs {
  onWarning: (msg: string) => void;
}

export function useFileAttachments({ onWarning }: UseFileAttachmentsArgs) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const remaining = MAX_ATTACHMENTS - attachments.length;
    if (remaining <= 0) {
      onWarning(`Maximum ${MAX_ATTACHMENTS} attachments per message.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const newAttachments: Attachment[] = [];
    const files = Array.from(e.target.files).slice(0, remaining);

    for (const file of files) {
      const mimeType = inferMimeType(file);
      const kind = classifyFile(file, mimeType);

      if (kind === "unknown") {
        onWarning(`"${file.name}" is not a supported file type.`);
        continue;
      }

      const maxMb = maxMbForKind(kind);
      if (file.size > maxMb * 1024 * 1024) {
        onWarning(`"${file.name}" exceeds the ${maxMb} MB limit.`);
        continue;
      }

      const buffer = await file.arrayBuffer();
      const base64String = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ""),
      );
      newAttachments.push({ mime_type: mimeType, data: base64String, name: file.name });
    }

    if (newAttachments.length > 0) setAttachments((prev) => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearAttachments = () => setAttachments([]);

  return { attachments, fileInputRef, handleFileChange, removeAttachment, clearAttachments };
}
