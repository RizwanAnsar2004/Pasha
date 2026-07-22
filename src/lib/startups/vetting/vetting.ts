// Client-side vetting scorer.

export type VettingTier = "featured" | "listed" | "watchlist" | "excluded";

export type VettingInput = {
  // identity / gates
  startup_name?: string;
  website?: string;
  founder_name?: string;
  founder_email?: string;
  description?: string;

  // stage / depth
  stage?: string;
  year_founded?: string | Date | null;

  // traction
  revenue_band?: string;
  raised_funding?: boolean;
  funding_stage?: string;

  // team / governance — female_founders is derived from the founders array
  total_founders?: number;
  total_employees?: number;
  female_founders?: number;
  fbr_registered?: boolean;
  secp_registered?: boolean;

  // ecosystem
  incubated_in_nic?: boolean;
  nic_name?: string;
  has_patents?: boolean;

  // sector
  primary_sector?: string;
};

export type VettingResult = {
  score: number;
  tier: VettingTier;
  passes_gates: boolean;
  gate_failures: string[];
  breakdown: { dimension: string; score: number; max: 5; reason: string }[];
};

export function scoreVetting(input: VettingInput): VettingResult {
  const gates: { name: string; pass: boolean }[] = [
    {
      name: "Has startup name",
      pass: !!input.startup_name && input.startup_name.length >= 2,
    },
    {
      name: "Has working URL",
      pass: !!input.website && /^https?:\/\/|\./.test(input.website),
    },
    {
      name: "Has founder name",
      pass: !!input.founder_name && input.founder_name.length >= 2,
    },
    {
      name: "Has founder email",
      pass: !!input.founder_email && /@/.test(input.founder_email),
    },
    {
      name: "Has description",
      pass: !!input.description && input.description.length >= 50,
    },
  ];

  const gate_failures = gates.filter((g) => !g.pass).map((g) => g.name);
  const passes_gates = gate_failures.length === 0;

  // Scoring dimensions
  const breakdown: VettingResult["breakdown"] = [];

  // 1. Product maturity (based on stage)
  const stageMap: Record<string, { score: number; reason: string }> = {
    "MVP/Prototype": { score: 2, reason: "Building MVP" },
    "Production/market fit": { score: 4, reason: "Shipping to market" },
    "Pre-Seed": { score: 2, reason: "Pre-seed stage" },
    Seed: { score: 3, reason: "Seed stage" },
    "Series A": { score: 4, reason: "Series A — proven traction" },
    "Growth (Series B,C)": { score: 5, reason: "Scaling" },
    "Scale (D+)": { score: 5, reason: "Late-stage scale" },
    Other: { score: 1, reason: "Stage not specified" },
  };
  const stageEntry = input.stage ? stageMap[input.stage] : null;
  breakdown.push({
    dimension: "Product maturity",
    score: stageEntry?.score ?? 0,
    max: 5,
    reason: stageEntry?.reason ?? "Not provided",
  });

  // 2. Funding & traction
  const fundingStageScore: Record<string, number> = {
    Bootstrapped: 2,
    Angel: 3,
    "Pre-seed": 3,
    Seed: 4,
    "Seed A": 5,
    "Seed B": 5,
    "Seed C & Beyond": 5,
    "Corporate Funding": 4,
    "Accelerate Round": 3,
    "Crowd Funding": 2,
    Other: 2,
  };
  const revenueScore: Record<string, number> = {
    "0": 0,
    "<10k": 1,
    "10k-50k": 2,
    "50k-250k": 3,
    "250k-1m": 4,
    ">1m": 5,
  };
  const fScore = input.funding_stage ? fundingStageScore[input.funding_stage] ?? 0 : 0;
  const rScore = input.revenue_band ? revenueScore[input.revenue_band] ?? 0 : 0;
  const fundingTractionScore = Math.max(fScore, rScore);
  breakdown.push({
    dimension: "Funding & traction",
    score: fundingTractionScore,
    max: 5,
    reason: input.funding_stage || input.revenue_band || "No funding/revenue data",
  });

  // 3. Team strength (employees + founders)
  let teamScore = 0;
  const emp = input.total_employees ?? 0;
  if (emp >= 25) teamScore = 5;
  else if (emp >= 10) teamScore = 4;
  else if (emp >= 5) teamScore = 3;
  else if (emp >= 2) teamScore = 2;
  else if (emp >= 1) teamScore = 1;
  breakdown.push({
    dimension: "Team strength",
    score: teamScore,
    max: 5,
    reason: `${emp || 0} employees`,
  });

  // 4. Market / vertical attractiveness
  const hotSectors = [
    "Artificial Intelligence (AI)",
    "Fintech",
    "SaaS",
    "AgriTech",
    "HealthTech",
    "Cybersecurity",
    "EdTech",
  ];
  const sectorScore = hotSectors.includes(input.primary_sector ?? "") ? 5 : 3;
  breakdown.push({
    dimension: "Market & vertical",
    score: input.primary_sector ? sectorScore : 0,
    max: 5,
    reason: input.primary_sector ?? "Not selected",
  });

  // 5. International readiness — proxy: domain, funding stage
  const intlReady = input.website && /\.(com|io|ai|co)$/.test(input.website) ? 3 : 2;
  breakdown.push({
    dimension: "International readiness",
    score: input.website ? intlReady : 0,
    max: 5,
    reason: input.website ?? "No website",
  });

  // 6. Revenue model clarity — having a stage + revenue band. Pre-revenue
  const PRE_REVENUE_STAGES = new Set(["MVP/Prototype", "Pre-Seed", "Other"]);
  const revClarity = !input.stage ? 0 : PRE_REVENUE_STAGES.has(input.stage) ? 2 : 4;
  breakdown.push({
    dimension: "Revenue model clarity",
    score: revClarity,
    max: 5,
    reason: input.stage ?? "No stage selected",
  });

  // 7. Ecosystem contribution — NIC affiliation, FBR/SECP registration, female founders
  let ecoScore = 0;
  if (input.fbr_registered) ecoScore += 1;
  if (input.secp_registered) ecoScore += 2;
  if (input.incubated_in_nic) ecoScore += 1;
  if ((input.female_founders ?? 0) > 0) ecoScore += 1;
  ecoScore = Math.min(ecoScore, 5);
  breakdown.push({
    dimension: "Ecosystem contribution",
    score: ecoScore,
    max: 5,
    reason: "Compliance + diversity signals",
  });

  // 8. Tech moat / defensibility
  const moatScore = input.has_patents ? 5 : input.incubated_in_nic ? 3 : 2;
  breakdown.push({
    dimension: "Tech moat",
    score: moatScore,
    max: 5,
    reason: input.has_patents ? "Has patents" : input.incubated_in_nic ? "NIC-validated" : "Standard",
  });

  // 9. Repeatable acquisition — used to score off customer_band, which we
  const acqScore = (() => {
    const rb = input.revenue_band ?? "";
    if (rb === ">1m") return 5;
    if (rb === "250k-1m" || rb === "50k-250k") return 4;
    if (rb === "10k-50k" || rb === "<10k") return 3;
    if (rb === "0") return 1;
    return 0;
  })();
  breakdown.push({
    dimension: "Repeatable acquisition",
    score: acqScore,
    max: 5,
    reason: input.revenue_band
      ? `Revenue band: ${input.revenue_band}`
      : "No revenue signal",
  });

  // 10. PASHA strategic fit — has all of: clean stage, clean sector, gates pass
  const fitScore =
    passes_gates && input.stage && input.primary_sector ? 4 : passes_gates ? 2 : 0;
  breakdown.push({
    dimension: "Strategic fit",
    score: fitScore,
    max: 5,
    reason: passes_gates ? "Passes hard gates" : "Hard gate failure",
  });

  const score = breakdown.reduce((sum, b) => sum + b.score, 0);

  let tier: VettingTier;
  if (!passes_gates) tier = "excluded";
  else if (score >= 35) tier = "featured";
  else if (score >= 25) tier = "listed";
  else if (score >= 15) tier = "watchlist";
  else tier = "excluded";

  return { score, tier, passes_gates, gate_failures, breakdown };
}

export function tierLabel(tier: VettingTier): string {
  return (
    {
      featured: "Featured",
      listed: "Listed",
      watchlist: "Watchlist",
      excluded: "Under review",
    }[tier] ?? "Unknown"
  );
}

export function tierColor(tier: VettingTier): string {
  return (
    {
      featured: "var(--color-tier-featured)",
      listed: "var(--color-tier-listed)",
      watchlist: "var(--color-tier-watchlist)",
      excluded: "var(--color-tier-excluded)",
    }[tier] ?? "var(--color-pasha-muted)"
  );
}
