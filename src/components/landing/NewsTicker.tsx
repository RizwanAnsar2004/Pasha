const TICKER_ITEMS = [
  "350+ verified Pakistani product startups",
  "New cohort of women-led founders spotlighted",
  "PASHA Startup Founders Forum — applications open",
  "Global award-winning startups added this quarter",
  "Investor introductions now open to Featured tier",
  "No fee · No equity · Just visibility",
];

export function NewsTicker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div className="relative overflow-hidden bg-pasha-ink border-y border-white/10 py-5">
      <div className="flex w-max animate-marquee">
        {items.map((item, i) => (
          <span key={i} className="flex items-center shrink-0 px-6 text-sm font-bold text-white whitespace-nowrap">
            {item}
            <span aria-hidden className="ml-6 text-pasha-red">
              &#10022;
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
