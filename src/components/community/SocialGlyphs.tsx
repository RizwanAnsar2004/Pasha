// Brand marks for the footer's follow row. Inline SVG so no icon package or
// remote asset is involved.

export function TwitterGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M23.64 4.57a9.9 9.9 0 0 1-2.79.77 4.87 4.87 0 0 0 2.14-2.69 9.74 9.74 0 0 1-3.09 1.18A4.86 4.86 0 0 0 11.6 8.3a13.8 13.8 0 0 1-10-5.08 4.86 4.86 0 0 0 1.5 6.49 4.82 4.82 0 0 1-2.2-.61v.06a4.86 4.86 0 0 0 3.9 4.77 4.9 4.9 0 0 1-2.19.08 4.87 4.87 0 0 0 4.54 3.38A9.76 9.76 0 0 1 0 19.54a13.75 13.75 0 0 0 7.55 2.21c9.06 0 14.01-7.5 14.01-14.01l-.02-.64a9.94 9.94 0 0 0 2.1-2.53z" />
    </svg>
  );
}

export function YouTubeGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.08 0 12 0 12s0 3.92.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.92 24 12 24 12s0-3.92-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z" />
    </svg>
  );
}

export function LinkedInGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zm1.78 13.02H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}
