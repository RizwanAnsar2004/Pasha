import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function PashaLogo({
  className,
  href = "/",
  alt = "P@SHA",
  width = 140,
  priority = false,
}: {
  className?: string;
  href?: string | null;
  alt?: string;
  width?: number;
  priority?: boolean;
}) {
  const img = (
    <Image
      src="/pasha-logo.png"
      alt={alt}
      width={width}
      height={Math.round((width / 908) * 288)}
      priority={priority}
      className={cn("h-auto w-auto object-contain", className)}
    />
  );
  return href ? <Link href={href} className="inline-flex items-center">{img}</Link> : img;
}
