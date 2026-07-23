import Link from "next/link";
import { cn } from "@/lib/utils";

export function PashaLogo({
  className,
  href = "/",
  alt = "PASHA",
  width = 50,
  priority = false,
  // Light lockup (dark text) for light backgrounds; pass the dark variant
  // (white text) for dark backgrounds like the footer.
  src = "/pasha-logo.svg",
}: {
  className?: string;
  href?: string | null;
  alt?: string;
  width?: number;
  priority?: boolean;
  src?: string;
}) {
  // Cropped viewBox of the SVG lockup is 832.9×332.3.
  const height = Math.round((width / 832.9) * 332.3);
  const img = (
    // Plain <img>: the logo is an SVG, so next/image optimization adds nothing
    // and would otherwise require dangerouslyAllowSVG.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      // Fixed pixel size, not "w-auto h-auto" — those CSS classes override the
      // width/height attributes and make the browser render at the intrinsic size.
      style={{ width, height }}
      className={cn("object-contain", className)}
    />
  );
  return href ? <Link href={href} className="inline-flex items-center">{img}</Link> : img;
}
