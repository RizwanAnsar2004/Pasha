// Downscale/re-encode an image File so it fits comfortably under a request-body
// limit before upload. Photos off phones are routinely 3–8 MB and a reverse
// proxy in front of the app often caps bodies at ~1 MB — this keeps uploads
// well under that without the user resizing anything by hand.
//
// Skips SVG (vector) and GIF (may be animated); those pass through untouched.

const TARGET_BYTES = 900_000; // aim under a ~1 MB proxy body cap
const MAX_EDGE = 1600; // longest side after downscale
const MIN_QUALITY = 0.5;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("Could not decode image"));
    img.src = url;
  });
}

export async function compressImage(file: File): Promise<File> {
  if (typeof document === "undefined") return file;
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/svg+xml" || file.type === "image/gif") return file;
  // Already small enough — don't recompress and risk quality loss.
  if (file.size <= TARGET_BYTES) return file;

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    // JPEG has no alpha — flatten onto white so a transparent PNG doesn't go black.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);

    // Step quality down until it fits (or we hit the floor).
    let quality = 0.85;
    let blob = await toBlob(canvas, quality);
    while (blob && blob.size > TARGET_BYTES && quality > MIN_QUALITY) {
      quality -= 0.1;
      blob = await toBlob(canvas, quality);
    }
    if (!blob || blob.size >= file.size) return file; // no gain — keep original

    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    return file; // never block an upload because compression failed
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((res) => canvas.toBlob(res, "image/jpeg", quality));
}
