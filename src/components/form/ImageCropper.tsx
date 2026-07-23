"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Loader2, RotateCcw, X, ZoomIn } from "lucide-react";

// Fixed-aspect crop step shown between picking a file and uploading it.
// Deliberately dependency-free: drag to pan, wheel/slider to zoom, canvas to
// export. Output is a same-type Blob sized to `outputWidth`.
//
// The frame is the aspect the image will actually be displayed at, so what the
// user frames here is exactly what renders on the site — no more surprise
// crops from `object-cover` on a portrait photo.

export type CropShape = "square" | "round";

const VIEW_W = 460; // preferred crop viewport width in CSS px
const MAX_ZOOM = 4;
// Chrome the dialog needs around the crop frame: header, hint, slider, quick
// buttons, footer. The frame is shrunk to fit whatever is left.
const CHROME_H = 340;
const MIN_VIEW = 200;

function subscribeResize(cb: () => void) {
  window.addEventListener("resize", cb);
  window.addEventListener("orientationchange", cb);
  return () => {
    window.removeEventListener("resize", cb);
    window.removeEventListener("orientationchange", cb);
  };
}

// Primitive snapshots, so useSyncExternalStore never sees a new object identity.
function useViewportWidth() {
  return useSyncExternalStore(subscribeResize, () => window.innerWidth, () => 1024);
}
function useViewportHeight() {
  return useSyncExternalStore(subscribeResize, () => window.innerHeight, () => 768);
}

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

  // Size the crop frame to what the viewport can actually show, so the dialog
  // never grows taller than the screen. Growing past it meant the page behind
  // scrolled instead of the modal, leaving the controls unreachable.
  const winW = useViewportWidth();
  const winH = useViewportHeight();
  const { viewW, viewH } = useMemo(() => {
    const maxW = Math.max(MIN_VIEW, Math.min(VIEW_W, winW - 64));
    const maxH = Math.max(MIN_VIEW, winH - CHROME_H);
    let w = maxW;
    let h = w / aspect;
    if (h > maxH) {
      h = maxH;
      w = h * aspect;
    }
    return { viewW: Math.round(w), viewH: Math.round(h) };
  }, [winW, winH, aspect]);

  // Freeze the page behind the dialog while it's open.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

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

  // zoom = 1 means "cover": the image exactly fills the frame with nothing
  // cropped away on the narrow axis.
  const baseScale = img ? Math.max(viewW / img.width, viewH / img.height) : 1;
  // "fit": the whole image inside the frame, letterboxed. Zooming out this far
  // is what lets a wide or tall photo be used in full rather than forcing a
  // centre crop — the margins become background in the exported file.
  const fitScale = img ? Math.min(viewW / img.width, viewH / img.height) : 1;
  const minZoom = img ? fitScale / baseScale : 1;
  const scale = baseScale * zoom;

  // Keep the image covering the frame after any pan or zoom.
  const clamp = useCallback(
    (next: { x: number; y: number }, atScale: number) => {
      if (!img) return next;
      const maxX = Math.max(0, (img.width * atScale - viewW) / 2);
      const maxY = Math.max(0, (img.height * atScale - viewH) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, next.x)),
        y: Math.min(maxY, Math.max(-maxY, next.y)),
      };
    },
    [img, viewW, viewH]
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
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(minZoom, z - e.deltaY * 0.0015)));
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

      // Keep PNG (transparency, logos) as PNG; everything else to JPEG.
      const isPng = file.type === "image/png";

      // JPEG has no alpha, so a transparent source — or the margins left by
      // zooming out past "fill" — would render black. PNG keeps its alpha.
      if (!isPng) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, outW, outH);
      }

      // Source rect currently visible inside the frame.
      const sw = viewW / scale;
      const sh = viewH / scale;
      const sx = (img.width - sw) / 2 - view.x / scale;
      const sy = (img.height - sh) / 2 - view.y / scale;

      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);

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
      // Scrolls itself rather than the page behind it, and `overscroll-contain`
      // stops a scroll that reaches the end from chaining to the document.
      className="fixed inset-0 z-[80] overflow-y-auto overscroll-contain bg-pasha-ink/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Crop image"
    >
      <div className="flex min-h-full items-center justify-center">
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
            style={{ width: viewW, height: viewH }}
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
              min={minZoom}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              aria-label="Zoom"
              className="h-1 w-full flex-1 cursor-pointer appearance-none rounded-full bg-pasha-line accent-pasha-red"
            />
            <span className="w-12 shrink-0 text-right font-mono text-[11px] tabular-nums text-pasha-muted">
              {Math.round((scale / fitScale) * 100)}%
            </span>
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setOffset({ x: 0, y: 0 });
              }}
              aria-label="Reset"
              title="Reset"
              className="shrink-0 rounded-md p-1.5 text-pasha-muted hover:bg-pasha-stone/60 hover:text-pasha-ink"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          {/* Quick jumps between the two ends people actually want: the whole
              image visible, or the frame fully covered. */}
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setZoom(minZoom);
                setOffset({ x: 0, y: 0 });
              }}
              className="rounded-full border border-pasha-line px-3 py-1 text-xs font-medium text-pasha-ink hover:border-pasha-red hover:text-pasha-red"
            >
              Fit whole image
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setOffset({ x: 0, y: 0 });
              }}
              className="rounded-full border border-pasha-line px-3 py-1 text-xs font-medium text-pasha-ink hover:border-pasha-red hover:text-pasha-red"
            >
              Fill frame
            </button>
            {zoom < 1 && (
              <span className="text-[11px] text-pasha-muted">
                Margins are filled with {file.type === "image/png" ? "transparency" : "white"}.
              </span>
            )}
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
    </div>
  );
}
