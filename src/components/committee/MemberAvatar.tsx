import Image from "next/image";
import { initials } from "@/lib/utils";

// One avatar for every committee surface — public /committee, /about, and the
// admin management table. Uploaded headshot when there is one, the member's
// initials otherwise, so a row without a photo still reads as a person.
//
// `fill` inside a fixed, clipped box: any source aspect ratio crops to the
// frame instead of stretching its container.
export function MemberAvatar({
  name,
  photoUrl,
  size = "w-12 h-12",
  rounded = "rounded-2xl",
  className = "",
}: {
  name: string;
  photoUrl?: string | null;
  size?: string;
  rounded?: string;
  className?: string;
}) {
  if (photoUrl) {
    return (
      <div
        className={`relative ${size} ${rounded} overflow-hidden border border-pasha-line/30 shadow-sm shrink-0 group-hover:border-pasha-red/15 transition-all duration-300 ${className}`}
      >
        <Image src={photoUrl} alt={name} fill sizes="96px" className="object-cover" />
      </div>
    );
  }
  return (
    <div
      className={`${size} ${rounded} bg-pasha-ink/[0.07] border border-pasha-line/30 grid place-items-center font-bold text-sm text-pasha-ink/60 group-hover:bg-pasha-red/[0.09] group-hover:text-pasha-red group-hover:border-pasha-red/15 transition-all duration-300 shadow-sm shrink-0 ${className}`}
    >
      {initials(name)}
    </div>
  );
}
