"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RotateCcw, X, ZoomIn } from "lucide-react";

// Fixed-aspect crop step shown between picking a file and uploading it.
// Deliberately dependency-free: drag to pan, wheel/slider to zoom, canvas to
// export. Output is a same-type Blob sized to `outputWidth`.
//
// The frame is the aspect the image will actually be displayed at, so what the
// user frames here is exactly what renders on the site — no more surprise
// crops from `object-cover` on a portrait photo.

export type CropShape = "square" | "round";

const VIEW_W = 460; // crop viewport width in CSS px

type Props = {
  file: File;
  // width / height. 1 = square.
  aspect: number;
  // Circle overlay for avatars; the exported image is still a rectangle.
  shape?: CropShape;
  // Longest edge of the exported image.
  outputWidth?: number;
  onCancel: () => void;
  onCropped: (file: File) => void;
};

export function ImageCropper({
  file,
  aspect,
  shape = "square",
  outputWidth = 1024,
  onCancel,
  onCropped,
}: Props) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const viewH = Math.round(VIEW_W / aspect);

  // Create AND revoke the object URL inside one effect, so each mount owns its
  // own URL. Creating it in a useMemo instead meant React's double-invoked
  // effects (StrictMode, dev) revoked the memo's URL on the first cleanup and
  // never recreated it — the image then failed to load and the dialog sat on
  // its spinner forever.
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      setImg(image);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    image.onerror = () => setLoadError(true);
    image.src = url;
    return () => {
      image.onload = null;
      image.onerror = null;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // Scale at which the image exactly covers the frame — the minimum zoom, so
  // there's never a transparent gap inside the crop.
  const baseScale = img ? Math.max(VIEW_W / img.width, viewH / img.height) : 1;
  const scale = baseScale * zoom;

  // Keep the image covering the frame after any pan or zoom.
  const clamp = useCallback(
    (next: { x: number; y: number }, atScale: number) => {
      if (!img) return next;
      const maxX = Math.max(0, (img.width * atScale - VIEW_W) / 2);
      const maxY = Math.max(0, (img.height * atScale - viewH) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, next.x)),
        y: Math.min(maxY, Math.max(-maxY, next.y)),
      };
    },
    [img, viewH]
  );

  // Clamped during render rather than via an effect — zooming out shrinks the
  // allowed pan range, and re-clamping here avoids a second render pass.
  const view = clamp(offset, scale);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: view.x, oy: view.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setOffset(
      clamp({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) }, scale)
    );
  };
  const endDrag = () => {
    dragRef.current = null;
  };

  const onWheel = (e: React.WheelEvent) => {
    setZoom((z) => Math.min(4, Math.max(1, z - e.deltaY * 0.0015)));
  };

  // Map the on-screen frame back onto the source pixels and export.
  const apply = async () => {
    if (!img) return;
    setBusy(true);
    try {
      const outW = outputWidth;
      const outH = Math.round(outputWidth / aspect);
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");

      // JPEG has no alpha — fill white so transparent PNGs don't go black.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, outW, outH);

      // Source rect currently visible inside the frame.
      const sw = VIEW_W / scale;
      const sh = viewH / scale;
      const sx = (img.width - sw) / 2 - view.x / scale;
      const sy = (img.height - sh) / 2 - view.y / scale;

      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);

      // Keep PNG (transparency, logos) as PNG; everything else to JPEG.
      const isPng = file.type === "image/png";
      const type = isPng ? "image/png" : "image/jpeg";
      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob(res, type, isPng ? undefined : 0.92)
      );
      if (!blob) throw new Error("Could not render the crop");

      const ext = isPng ? "png" : "jpg";
      const base = file.name.replace(/\.[^.]+$/, "") || "image";
      onCropped(new File([blob], `${base}.${ext}`, { type }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-pasha-ink/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Crop image"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-pasha-line bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-pasha-line px-5 py-3.5">
          <h2 className="text-sm font-semibold text-pasha-ink">Crop image</h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel crop"
            className="rounded-full p-1.5 text-pasha-muted hover:bg-pasha-stone/60 hover:text-pasha-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="mb-3 text-xs text-pasha-muted">
            Drag to reposition, scroll or use the slider to zoom. The framed area
            is exactly what will be shown on the site.
          </p>

          <div
            className="relative mx-auto touch-none overflow-hidden bg-pasha-stone/60 select-none"
            style={{ width: VIEW_W, maxWidth: "100%", height: viewH }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onWheel={onWheel}
          >
            {img ? (
              // Rendered straight from the loaded element, so the displayed
              // URL is always the one this mount created.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={img.src}
                alt=""
                draggable={false}
                className="absolute left-1/2 top-1/2 max-w-none cursor-grab active:cursor-grabbing"
                style={{
                  width: img.width * scale,
                  height: img.height * scale,
                  transform: `translate(-50%, -50%) translate(${view.x}px, ${view.y}px)`,
                }}
              />
            ) : (
              <div className="grid h-full place-items-center px-6 text-center">
                {loadError ? (
                  <p className="text-sm text-pasha-red">
                    That image couldn&rsquo;t be read. Try a different file.
                  </p>
                ) : (
                  <Loader2 className="h-5 w-5 animate-spin text-pasha-muted" />
                )}
              </div>
            )}

            {/* Frame overlay */}
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-0 border-2 border-white/80 shadow-[0_0_0_9999px_rgba(14,14,16,0.35)] ${
                shape === "round" ? "rounded-full" : "rounded-lg"
              }`}
            />
          </div>

          <div className="mt-4 flex items-center gap-3">
            <ZoomIn className="h-4 w-4 shrink-0 text-pasha-muted" />
            <input
              type="range"
              min={1}
              max={4}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              aria-label="Zoom"
              className="h-1 w-full flex-1 cursor-pointer appearance-none rounded-full bg-pasha-line accent-pasha-red"
            />
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setOffset({ x: 0, y: 0 });
              }}
              aria-label="Reset"
              className="shrink-0 rounded-md p-1.5 text-pasha-muted hover:bg-pasha-stone/60 hover:text-pasha-ink"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-pasha-line bg-pasha-stone/30 px-5 py-3.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-pasha-line bg-white px-4 py-2 text-sm font-medium text-pasha-ink hover:bg-pasha-stone/60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={!img || busy}
            className="inline-flex items-center gap-2 rounded-lg bg-pasha-red px-4 py-2 text-sm font-medium text-white hover:bg-pasha-red-dark disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Use image
          </button>
        </div>
      </div>
    </div>
  );
}
