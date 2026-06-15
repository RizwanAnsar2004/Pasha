import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Per-bucket security profile.
// NOTE on size limits: Vercel serverless function body cap is ~4.5MB for FormData
// uploads on most plans. We cap at 4MB here to give the user a clean app-level
// error rather than Vercel's generic 413. Larger files would need direct-to-
// Supabase signed-upload URLs.
const FOUR_MB = 4 * 1024 * 1024;

// WEBP needs a special check — RIFF (bytes 0-3) is shared with AVI/WAV/ANI.
// True WEBP also has "WEBP" at bytes 8-11.
function isWebpHeader(head: Uint8Array): boolean {
  if (head.length < 12) return false;
  return (
    head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 &&
    head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50
  );
}

const BUCKETS = {
  logos: {
    public: true,
    maxBytes: FOUR_MB,
    allowedMime: new Set([
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/svg+xml",
    ]),
    allowedExt: new Set(["png", "jpg", "jpeg", "webp", "svg"]),
    magicBytes: [
      // PNG
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      // JPEG
      [0xff, 0xd8, 0xff],
      // SVG (text-based — starts with < or whitespace then <)
      [0x3c],
      // SVG with BOM
      [0xef, 0xbb, 0xbf, 0x3c],
    ],
    customCheck: isWebpHeader, // also accept WEBP if isWebpHeader returns true
  },
  "founder-photos": {
    public: true,
    maxBytes: FOUR_MB,
    allowedMime: new Set(["image/png", "image/jpeg", "image/webp"]),
    allowedExt: new Set(["png", "jpg", "jpeg", "webp"]),
    magicBytes: [
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], // PNG
      [0xff, 0xd8, 0xff],                                // JPEG
    ],
    customCheck: isWebpHeader,
  },
  "pitch-decks": {
    public: false,
    maxBytes: FOUR_MB,
    // PDF only. PPT/PPTX were originally allowed but the schema rendering
    // attack surface is much higher; we'll keep this PDF-only for now.
    allowedMime: new Set(["application/pdf"]),
    allowedExt: new Set(["pdf"]),
    magicBytes: [
      [0x25, 0x50, 0x44, 0x46, 0x2d], // "%PDF-"
    ],
  },
} as const;

type BucketName = keyof typeof BUCKETS;

function isAllowedBucket(name: string): name is BucketName {
  return Object.prototype.hasOwnProperty.call(BUCKETS, name);
}

function safeExt(filename: string): string {
  const cleaned = filename.replace(/[^a-zA-Z0-9._-]/g, "");
  const parts = cleaned.split(".");
  return (parts[parts.length - 1] ?? "").toLowerCase();
}

function magicMatches(headBytes: Uint8Array, profiles: readonly (readonly number[])[]): boolean {
  for (const sig of profiles) {
    if (headBytes.length < sig.length) continue;
    let ok = true;
    for (let i = 0; i < sig.length; i++) {
      if (headBytes[i] !== sig[i]) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

export async function POST(req: Request) {
  try {
    const fd = await req.formData();
    const file = fd.get("file");
    const bucketName = String(fd.get("bucket") ?? "");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    if (!isAllowedBucket(bucketName)) {
      return NextResponse.json({ error: "Invalid bucket" }, { status: 400 });
    }
    const profile = BUCKETS[bucketName];

    // Size check
    if (file.size === 0) {
      return NextResponse.json({ error: "Empty file" }, { status: 400 });
    }
    if (file.size > profile.maxBytes) {
      return NextResponse.json(
        { error: `File too large. Max ${Math.floor(profile.maxBytes / (1024 * 1024))}MB.` },
        { status: 400 }
      );
    }

    // Extension check
    const ext = safeExt(file.name);
    if (!ext || !profile.allowedExt.has(ext)) {
      return NextResponse.json(
        { error: `File extension '.${ext || "?"}' not allowed for this field` },
        { status: 400 }
      );
    }

    // Client-supplied MIME check (advisory only; we still verify magic bytes)
    const clientMime = (file.type || "").toLowerCase();
    if (clientMime && !profile.allowedMime.has(clientMime)) {
      return NextResponse.json(
        { error: `MIME type '${clientMime}' not allowed for this field` },
        { status: 400 }
      );
    }

    // Magic-byte check — peek first 16 bytes
    const buf = await file.arrayBuffer();
    const head = new Uint8Array(buf.slice(0, 16));
    const customCheck = "customCheck" in profile ? (profile as { customCheck?: (h: Uint8Array) => boolean }).customCheck : undefined;
    if (!magicMatches(head, profile.magicBytes) && !(customCheck && customCheck(head))) {
      return NextResponse.json(
        { error: "File contents do not match the expected format" },
        { status: 400 }
      );
    }

    // Force server-controlled MIME to prevent client lying about Content-Type
    // (e.g., uploading .exe with claimed image/png).
    let serverContentType: string;
    if (bucketName === "pitch-decks") {
      serverContentType = "application/pdf";
    } else {
      // For images, pick from the magic bytes or fall back to client mime
      if (head[0] === 0x89) serverContentType = "image/png";
      else if (head[0] === 0xff && head[1] === 0xd8) serverContentType = "image/jpeg";
      else if (head[0] === 0x52) serverContentType = "image/webp";
      else if (head[0] === 0x3c || (head[0] === 0xef && head[3] === 0x3c)) serverContentType = "image/svg+xml";
      else serverContentType = clientMime || "application/octet-stream";
    }

    // Generate a clean random filename
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

    const supabase = createServiceClient();
    const { error: upErr } = await supabase.storage
      .from(bucketName)
      .upload(name, buf, {
        contentType: serverContentType,
        cacheControl: "31536000",
      });

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    let url: string;
    if (!profile.public) {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(name, 60 * 60 * 24 * 365);
      if (error || !data) {
        return NextResponse.json({ error: error?.message ?? "Sign failed" }, { status: 500 });
      }
      url = data.signedUrl;
    } else {
      const { data } = supabase.storage.from(bucketName).getPublicUrl(name);
      url = data.publicUrl;
    }

    return NextResponse.json({ url, path: name });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
