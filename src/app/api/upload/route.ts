import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Per-bucket security profile.
const FOUR_MB = 4 * 1024 * 1024;
// Documents are seeded with maxSizeMB:10 in the form config — the server cap
// has to match or the client lets through uploads the API then rejects.
const TEN_MB = 10 * 1024 * 1024;

// WEBP needs a special check — RIFF (bytes 0-3) is shared with AVI/WAV/ANI.
function isWebpHeader(head: Uint8Array): boolean {
  if (head.length < 12) return false;
  return (
    head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 &&
    head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50
  );
}

// One entry per file format the form builder can offer. `magic: null` means the
// format has no reliable signature (plain text) — those are checked negatively
// instead, by rejecting known binary headers.
type FileTypeId =
  | "pdf" | "png" | "jpeg" | "webp" | "svg"
  | "doc" | "docx" | "xls" | "xlsx" | "ppt" | "pptx" | "csv";

type FileTypeDef = {
  ext: readonly string[];
  mime: readonly string[];
  magic: readonly (readonly number[])[] | null;
  custom?: (head: Uint8Array) => boolean;
  // Content type we store it under, regardless of what the client claimed.
  contentType: string;
};

// OOXML (.docx/.xlsx/.pptx) are ZIP containers, so they share one signature and
// can only be told apart by extension. Legacy Office (.doc/.xls/.ppt) share the
// OLE2 compound-document header for the same reason.
const ZIP = [[0x50, 0x4b, 0x03, 0x04], [0x50, 0x4b, 0x05, 0x06], [0x50, 0x4b, 0x07, 0x08]] as const;
const OLE2 = [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]] as const;

const FILE_TYPES: Record<FileTypeId, FileTypeDef> = {
  pdf: {
    ext: ["pdf"],
    mime: ["application/pdf"],
    magic: [[0x25, 0x50, 0x44, 0x46, 0x2d]], // "%PDF-"
    contentType: "application/pdf",
  },
  png: {
    ext: ["png"],
    mime: ["image/png"],
    magic: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    contentType: "image/png",
  },
  jpeg: {
    ext: ["jpg", "jpeg"],
    mime: ["image/jpeg"],
    magic: [[0xff, 0xd8, 0xff]],
    contentType: "image/jpeg",
  },
  webp: {
    ext: ["webp"],
    mime: ["image/webp"],
    magic: [],
    custom: isWebpHeader,
    contentType: "image/webp",
  },
  svg: {
    ext: ["svg"],
    mime: ["image/svg+xml"],
    // Text-based: "<" directly, or after a UTF-8 BOM.
    magic: [[0x3c], [0xef, 0xbb, 0xbf, 0x3c]],
    contentType: "image/svg+xml",
  },
  doc: {
    ext: ["doc"],
    mime: ["application/msword"],
    magic: OLE2,
    contentType: "application/msword",
  },
  docx: {
    ext: ["docx"],
    mime: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    magic: ZIP,
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  xls: {
    ext: ["xls"],
    mime: ["application/vnd.ms-excel"],
    magic: OLE2,
    contentType: "application/vnd.ms-excel",
  },
  xlsx: {
    ext: ["xlsx"],
    mime: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    magic: ZIP,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },
  ppt: {
    ext: ["ppt"],
    mime: ["application/vnd.ms-powerpoint"],
    magic: OLE2,
    contentType: "application/vnd.ms-powerpoint",
  },
  pptx: {
    ext: ["pptx"],
    mime: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
    magic: ZIP,
    contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  },
  csv: {
    ext: ["csv"],
    mime: ["text/csv", "application/csv", "text/plain"],
    magic: null, // plain text — no signature to match
    contentType: "text/csv",
  },
};

// ext → type id, for resolving an upload from its filename.
const EXT_TO_TYPE = new Map<string, FileTypeId>();
for (const [id, def] of Object.entries(FILE_TYPES) as [FileTypeId, FileTypeDef][]) {
  for (const e of def.ext) EXT_TO_TYPE.set(e, id);
}

// Headers that must never appear in a file claiming to be plain text — catches
// a renamed archive or executable uploaded as .csv.
const BINARY_HEADERS = [
  [0x50, 0x4b, 0x03, 0x04],             // ZIP
  [0xd0, 0xcf, 0x11, 0xe0],             // OLE2
  [0x4d, 0x5a],                         // MZ (Windows executable)
  [0x7f, 0x45, 0x4c, 0x46],             // ELF
  [0x25, 0x50, 0x44, 0x46],             // PDF
  [0x89, 0x50, 0x4e, 0x47],             // PNG
  [0xff, 0xd8, 0xff],                   // JPEG
] as const;

// A bucket is the hard ceiling: the admin's per-field choice can narrow this
// set but never widen it. Public buckets stay image-only on purpose.
const BUCKETS = {
  logos: {
    public: true,
    maxBytes: FOUR_MB,
    types: ["png", "jpeg", "webp", "svg"] as FileTypeId[],
  },
  "founder-photos": {
    public: true,
    maxBytes: FOUR_MB,
    types: ["png", "jpeg", "webp"] as FileTypeId[],
  },
  // The private document bucket. Despite the name it backs every document
  // field — pitch deck, business profile, registration certificate,
  // authorization letter, founder CNIC/passport — so it carries every document
  // format the form builder can offer. The per-field `accept` decides which of
  // these a given field actually takes.
  "pitch-decks": {
    public: false,
    maxBytes: TEN_MB,
    types: [
      "pdf", "png", "jpeg", "webp",
      "doc", "docx", "xls", "xlsx", "ppt", "pptx", "csv",
    ] as FileTypeId[],
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

// The original filename minus its extension, reduced to a storage-safe slug.
// We keep it in the object key so the UI can show the real filename again after
// a reload — the form only persists the resulting URL, not the picked File.
// Underscores are dropped because "__" is our separator in the key (see below),
// and the length is capped to keep keys short.
function safeBaseName(filename: string): string {
  const cleaned = filename.replace(/[^a-zA-Z0-9._-]/g, "");
  const dot = cleaned.lastIndexOf(".");
  const base = dot > 0 ? cleaned.slice(0, dot) : cleaned;
  return base.replace(/_/g, "-").slice(0, 60);
}

function matchesAny(
  headBytes: Uint8Array,
  profiles: readonly (readonly number[])[]
): boolean {
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

// Does the file's content match the format its extension claims?
function contentMatchesType(head: Uint8Array, def: FileTypeDef): boolean {
  if (def.magic === null) return !matchesAny(head, BINARY_HEADERS);
  if (matchesAny(head, def.magic)) return true;
  return Boolean(def.custom?.(head));
}

// The extensions an admin allowed for this field, read from the same
// `validation.accept` map the form builder writes. Returns null when the field
// has no accept configured (or isn't a form-config field at all), in which case
// the bucket ceiling applies unchanged.
async function acceptedExtsForField(
  supabase: ReturnType<typeof createServiceClient>,
  fieldKey: string
): Promise<Set<string> | null> {
  if (!fieldKey) return null;
  const { data, error } = await supabase
    .from("form_config")
    .select("validation")
    .eq("field_key", fieldKey)
    .maybeSingle<{ validation: { accept?: Record<string, string[]> } | null }>();

  if (error || !data?.validation?.accept) return null;

  const exts = new Set<string>();
  for (const [mime, list] of Object.entries(data.validation.accept)) {
    // Entries look like {"image/png": [".png"]} — the extension list is
    // authoritative, but a wildcard ("image/*") only carries its list.
    for (const raw of list ?? []) {
      const e = raw.replace(/^\./, "").toLowerCase();
      if (e) exts.add(e);
    }
    // A bare wildcard with no extensions still means "any of this family".
    if ((list ?? []).length === 0 && mime.endsWith("/*")) {
      const family = mime.slice(0, -2);
      for (const [, def] of Object.entries(FILE_TYPES) as [FileTypeId, FileTypeDef][]) {
        if (def.contentType.startsWith(`${family}/`)) def.ext.forEach((e) => exts.add(e));
      }
    }
  }
  return exts.size > 0 ? exts : null;
}

export async function POST(req: Request) {
  try {
    const fd = await req.formData();
    const file = fd.get("file");
    const bucketName = String(fd.get("bucket") ?? "");
    // Optional: the form-config field this upload belongs to, so the admin's
    // per-field "accept" setting is enforced server-side too.
    const fieldKey = String(fd.get("fieldKey") ?? "").trim();

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    if (!isAllowedBucket(bucketName)) {
      return NextResponse.json({ error: "Invalid bucket" }, { status: 400 });
    }
    const profile = BUCKETS[bucketName];
    const supabase = createServiceClient();

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

    // Resolve the format from the extension.
    const ext = safeExt(file.name);
    const typeId = ext ? EXT_TO_TYPE.get(ext) : undefined;
    if (!typeId || !profile.types.includes(typeId)) {
      return NextResponse.json(
        { error: `File extension '.${ext || "?"}' not allowed for this field` },
        { status: 400 }
      );
    }
    const typeDef = FILE_TYPES[typeId];

    // Narrow by the admin's per-field choice. This can only ever restrict the
    // bucket ceiling above, so a tampered fieldKey can't widen anything.
    const fieldExts = await acceptedExtsForField(supabase, fieldKey);
    if (fieldExts && !fieldExts.has(ext)) {
      return NextResponse.json(
        { error: `'.${ext}' is not accepted by this field` },
        { status: 400 }
      );
    }

    // Client-supplied MIME check (advisory only; we still verify magic bytes)
    const clientMime = (file.type || "").toLowerCase();
    if (clientMime && !typeDef.mime.includes(clientMime)) {
      return NextResponse.json(
        { error: `MIME type '${clientMime}' does not match '.${ext}'` },
        { status: 400 }
      );
    }

    // Magic-byte check — peek first 16 bytes
    const buf = await file.arrayBuffer();
    const head = new Uint8Array(buf.slice(0, 16));
    if (!contentMatchesType(head, typeDef)) {
      return NextResponse.json(
        { error: "File contents do not match the expected format" },
        { status: 400 }
      );
    }

    // Store under the format's canonical content type, never the client's claim.
    const serverContentType = typeDef.contentType;

    // A random, unguessable prefix keeps the key clean and safe; the sanitised
    // original base name is appended after a "__" boundary so the UI can recover
    // a legible filename from the URL later (see displayNameFromUrl in FileUpload).
    const base = safeBaseName(file.name);
    const rand = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const name = base ? `${rand}__${base}.${ext}` : `${rand}.${ext}`;

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
