/**
 * Generate a small JPEG thumbnail (as a data URI) from a base64-encoded image.
 * Used by the chat composer to persist a lightweight preview alongside the
 * full attachment for message history.
 */
export function generateThumbnail(
  base64: string,
  mimeType: string,
  maxSize = 120,
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.6));
    };
    img.onerror = () => resolve("");
    img.src = `data:${mimeType};base64,${base64}`;
  });
}
