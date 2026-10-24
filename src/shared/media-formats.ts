export const imageExtensions = [
  "jpg",
  "jpeg",
  "jfif",
  "png",
  "webp",
  "avif",
  "gif",
  "bmp",
  "ico",
  "svg",
];
export function isImageFilename(file: string) {
  return imageExtensions.includes(file.split(".").at(-1)?.toLowerCase() ?? "");
}
export function imageMime(bytes: Uint8Array): string | null {
  const b = bytes,
    ascii = (a: number, n: number) => String.fromCharCode(...b.slice(a, a + n));
  if (b[0] === 255 && b[1] === 216 && b[2] === 255) return "image/jpeg";
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => b[i] === v))
    return "image/png";
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return "image/webp";
  if (
    ascii(4, 4) === "ftyp" &&
    /avif|avis/.test(ascii(8, Math.min(b.length - 8, 120)))
  )
    return "image/avif";
  if (ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a") return "image/gif";
  if (ascii(0, 2) === "BM") return "image/bmp";
  if (b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 0)
    return "image/x-icon";
  const prefix = new TextDecoder().decode(b.slice(0, 4096)).trimStart();
  if (/^(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)?<svg[\s>]/i.test(prefix))
    return "image/svg+xml";
  return null;
}
