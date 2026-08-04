"use client";

import { memo } from "react";
import { MapPin } from "lucide-react";
import { SECRETARIAT_MAP_EMBED_URL, SECRETARIAT_MAP_URL } from "@/lib/content/contact";

// The Google Maps embed, isolated into its own memoised component.
//
// QA observed the embed firing a cluster of billed Google API calls per page
// load (GetViewportInfo x3, GetPlace x2, InitMapsJwt x2, plus tile requests)
// and suggested the parent might be re-rendering and remounting the iframe.
// We checked: ContactContent holds no state and its parent is a server
// component, so nothing re-renders it and the iframe already mounted exactly
// once. The repeated calls therefore come from inside Google's own iframe
// during its normal start-up — our code cannot see or reduce them.
//
// memo() is kept regardless. It costs nothing and it guarantees the finding
// stays fixed: the moment anyone adds state to the Contact page (a form, a
// toast, a scroll listener), an unmemoised iframe here would start remounting
// and re-billing on every keystroke. This makes that class of regression
// impossible rather than merely absent today.
export const SecretariatMap = memo(function SecretariatMap() {
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-pasha-line">
      <iframe
        src={SECRETARIAT_MAP_EMBED_URL}
        title="Map showing the P@SHA Secretariat at Daftarkhwan Alpha, Rawalpindi"
        // Defers the embed until the map scrolls into view, so visitors who
        // never reach it pay neither the download nor the Google call.
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="block h-[260px] w-full border-0 lg:h-[300px]"
      />
      <a
        href={SECRETARIAT_MAP_URL}
        target="_blank"
        rel="noreferrer noopener"
        className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-2 text-xs font-semibold text-pasha-ink shadow-md backdrop-blur transition-colors hover:bg-pasha-red hover:text-white"
      >
        <MapPin className="h-3.5 w-3.5" aria-hidden />
        Get directions
      </a>
    </div>
  );
});
