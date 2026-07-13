import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function PashaLogo({
  className,
  href = "/",
  alt = "P@SHA",
  width = 50,
  priority = false,
}: {
  className?: string;
  href?: string | null;
  alt?: string;
  width?: number;
  priority?: boolean;
}) {
  // Intrinsic size of /public/pasha-logo.png is 908×288 (not 908×108 — that
  // was wrong and squished the logo into a too-short box).
  const height = Math.round((width / 908) * 288);
  const img = (
    <Image
      src="/pasha-logo.png"
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      // Fixed pixel size, not "w-auto h-auto" — those CSS classes override the
      // width/height attributes and make the browser render at the image's
      // natural/served size instead. That's harmless when the dev image
      // optimizer always resizes to match, but on hosts where optimization
      // isn't resizing correctly, the raw full-size PNG gets served and
      // renders huge. style={} pins the box size no matter what bytes arrive.
      style={{ width, height }}
      className={cn("object-contain", className)}
    />
  );
  return href ? <Link href={href} className="inline-flex items-center">{img}</Link> : img;
}
