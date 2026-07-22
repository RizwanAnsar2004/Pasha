// Single source for the published contact details — the contact page, footer
// and any email that cites them all read from here.

export const SECRETARIAT_ADDRESS =
  "Daftarkhwan Alpha, Old Airport Rd, Chaklala Cantt., Rawalpindi, Pakistan.";

export const CONTACT_PHONE_DISPLAY = "+92-51-8736624";
// tel: needs the bare international form, no separators.
export const CONTACT_PHONE_HREF = "tel:+92518736624";

export const STARTUPS_EMAIL = "startups@pasha.org.pk";

// Opens the address in whichever maps app the device prefers.
export const SECRETARIAT_MAP_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  SECRETARIAT_ADDRESS
)}`;

// Keyless Google Maps embed — renders a pin for the query, no API key needed.
export const SECRETARIAT_MAP_EMBED_URL = `https://maps.google.com/maps?q=${encodeURIComponent(
  "Daftarkhwan Alpha, Old Airport Road, Chaklala Cantt, Rawalpindi"
)}&z=16&output=embed`;
