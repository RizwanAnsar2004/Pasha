"use client";
import { ApiError, api, apiErrorMessage } from "@/lib/api/client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, ImageIcon, X, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type UploadBucket = "logos" | "founder-photos" | "pitch-decks";

export function FileUpload({
  bucket,
  value,
  onChange,
  accept,
  maxSizeMB = 5,
  label,
  hint,
  fieldKey,
}: {
  bucket: UploadBucket;
  value?: string;
  onChange: (url: string | undefined) => void;
  accept?: Record<string, string[]>;
  maxSizeMB?: number;
  label: string;
  hint?: string;
  // form_config field_key, when this upload belongs to a builder-defined field.
  // Lets the API enforce that field's own `accept` list, not just the bucket's.
  fieldKey?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      setError(null);
      setUploading(true);
      setFileName(file.name);

      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("bucket", bucket);
        if (fieldKey) fd.append("fieldKey", fieldKey);

        const data = await api.upload<{ url: string }>("/api/upload", fd);
        onChange(data.url);
      } catch (e) {
        // 413 never comes from this app — the route answers oversize files with
        // a 400 and a readable message. It means the web server or proxy in
        // front of Next rejected the body before the handler ever ran, so its
        // response is usually an HTML error page with no JSON to surface.
        if (e instanceof ApiError && e.status === 413) {
          setError(
            `The server rejected this file as too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please try a smaller file.`
          );
        } else {
          setError(apiErrorMessage(e, "Upload failed"));
        }
        setFileName(null);
      } finally {
        setUploading(false);
      }
    },
    [bucket, fieldKey, onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize: maxSizeMB * 1024 * 1024,
    multiple: false,
    disabled: uploading,
  });

  const isImage = bucket === "logos" || bucket === "founder-photos";

  return (
    <div>
      <AnimatePresence mode="wait">
        {value ? (
          <motion.div
            key="filled"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="rounded-lg border border-pasha-line bg-pasha-stone/30 px-4 py-3 flex items-center gap-3"
          >
            {/* `fill` + overflow-hidden keeps the thumbnail a fixed 40px square
                whatever the source aspect ratio — a portrait photo is cropped
                to the box instead of stretching the row out of shape. */}
            <div className="relative w-10 h-10 rounded-md bg-white border border-pasha-line overflow-hidden grid place-items-center shrink-0">
              {isImage ? (
                <Image
                  src={value}
                  alt="Uploaded"
                  fill
                  sizes="40px"
                  className="object-cover"
                  unoptimized={value.startsWith("blob:")}
                />
              ) : (
                <FileText className="w-5 h-5 text-pasha-red" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-pasha-ink truncate">
                {fileName ?? "Uploaded"}
              </p>
              <p className="text-xs text-pasha-muted flex items-center gap-1.5 mt-0.5">
                <Check className="w-3 h-3 text-tier-featured" />
                Saved
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onChange(undefined);
                setFileName(null);
              }}
              className="rounded-full p-1.5 hover:bg-pasha-line/60 transition-colors"
            >
              <X className="w-4 h-4 text-pasha-muted" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              {...getRootProps()}
              className={cn(
                "min-h-[132px] rounded-lg border-2 border-dashed px-4 py-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer",
                isDragActive
                  ? "border-pasha-red bg-pasha-red/[0.04]"
                  : "border-pasha-line bg-white hover:border-pasha-ink/30 hover:bg-pasha-stone/30",
                uploading && "pointer-events-none opacity-70"
              )}
            >
              <input {...getInputProps()} />
              {uploading ? (
                <Loader2 className="w-6 h-6 text-pasha-red animate-spin mb-2" />
              ) : isImage ? (
                <ImageIcon className="w-6 h-6 text-pasha-muted mb-2" strokeWidth={1.5} />
              ) : (
                <Upload className="w-6 h-6 text-pasha-muted mb-2" strokeWidth={1.5} />
              )}
              <p className="text-sm font-medium text-pasha-ink">
                {uploading
                  ? "Uploading…"
                  : isDragActive
                  ? "Drop here"
                  : label}
              </p>
              <p className="text-xs text-pasha-muted mt-1">
                {hint ?? `Max ${maxSizeMB}MB`}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {error && (
        <p className="mt-2 text-xs text-pasha-red">{error}</p>
      )}
    </div>
  );
}
