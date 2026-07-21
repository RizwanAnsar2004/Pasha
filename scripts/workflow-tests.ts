// Workflow logic tests (run: `npx tsx scripts/workflow-tests.ts`).
import { computeCompletion, computeFormModules } from "../src/lib/forms/profile-completion";
import { deriveStage } from "../src/lib/startups/vetting/workflow";
import { deriveBadges, earnedBadges, isYes } from "../src/lib/startups/vetting/badges";
import type { FormConfig } from "../src/lib/forms/form-config";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean) {
  if (cond) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.log(`  ❌ ${name}`);
  }
}
function section(t: string) {
  console.log(`\n${t}`);
}

// ---- Fixtures ----------------------------------------------------------------
const registrationOnly = {
  startup_name: "Acme",
  primary_sector: "Fintech",
  stage: "Series A",
  hq_city: "Karachi",
  tagline: "We do X",
};
const publicReady = {
  ...registrationOnly,
  logo_url: "https://x/logo.png",
  description: "A".repeat(60),
  business_model: "B2B",
  team_size: "6-10",
};
const businessComplete = {
  ...publicReady,
  problem_statement: "p",
  solution_statement: "s",
  product_features: "f",
  usp: "u",
  tam_amount: 1000,
  competitors_global: "c",
};
const featuredEligible = {
  ...businessComplete,
  monthly_active_users: 100,
  awards: "a",
  partnerships: "pp",
};
const investorReady = {
  ...featuredEligible,
  funding_status: "Bootstrapped",
  pitch_deck_url: "https://x/deck.pdf",
  contact_preference: "contact_form",
};

// ---- 1.
section("Workflow: profile completion ladder + 50% submit gate");
check("empty draft → 0%, gate closed", (() => {
  const c = computeCompletion({});
  return c.percent === 0 && c.publicProfileMet === false;
})());
check("registration-only → 25% (Draft), gate still closed", (() => {
  const c = computeCompletion(registrationOnly);
  return c.percent === 25 && c.publicProfileMet === false;
})());
check("public-ready fields → 50%, gate OPEN", (() => {
  const c = computeCompletion(publicReady);
  return c.percent === 50 && c.publicProfileMet === true;
})());
check("business fields → 75%", computeCompletion(businessComplete).percent === 75);
check("traction/awards/partnerships → 90%", computeCompletion(featuredEligible).percent === 90);
check("investor fields → 100%", computeCompletion(investorReady).percent === 100);
check("below-50 lists missing public fields (logo/description/business_model/team_size)", (() => {
  const miss = computeCompletion(registrationOnly).publicProfileMissing.map((m) => m.key);
  return ["logo_url", "description", "business_model", "team_size"].every((k) => miss.includes(k));
})());
check("cumulative: 100% data reports all 5 levels met", (() => {
  return computeCompletion(investorReady).levels.every((l) => l.met);
})());
check("nextLevel hint points to Public Profile Ready at 25%", (() => {
  return computeCompletion(registrationOnly).nextLevel?.key === "public_ready";
})());

// ---- 2.
section("Workflow: 6-state review stage derivation");
check("not submitted → draft", deriveStage({ submitted: false }) === "draft");
check("legacy 'pending' → submitted", deriveStage({ submitted: true, status: "pending" }) === "submitted");
check("'submitted' → submitted", deriveStage({ submitted: true, status: "submitted" }) === "submitted");
check("'needs_update' → needs_update", deriveStage({ submitted: true, status: "needs_update" }) === "needs_update");
check("'rejected' → rejected", deriveStage({ submitted: true, status: "rejected" }) === "rejected");
check("approved (plain) → approved", deriveStage({ submitted: true, status: "approved" }) === "approved");
check("approved + verified → verified", deriveStage({ submitted: true, status: "approved", pashaVerified: true }) === "verified");
check("approved + featured → featured (beats verified)", deriveStage({ submitted: true, status: "approved", pashaVerified: true, featuredActive: true }) === "featured");

// ---- 3.
section("Workflow: badge earning");
check("isYes truthy forms", isYes(true) && isYes("yes") && isYes("true"));
check("isYes falsy forms", !isYes(false) && !isYes("no") && !isYes(undefined) && !isYes(""));
check("self-declared badges earned from flags", (() => {
  const b = deriveBadges({ womenLed: true, hiring: true, fundraising: true });
  const e = Object.fromEntries(b.map((x) => [x.key, x.earned]));
  return e.women_led && e.hiring && e.fundraising && !e.verified && !e.featured;
})());
check("admin badges earned from admin flags only", (() => {
  const b = deriveBadges({ pashaVerified: true, featuredActive: true });
  const e = Object.fromEntries(b.map((x) => [x.key, x.earned]));
  return e.verified && e.featured && !e.women_led;
})());
check("opt-in: womenLed false → women_led NOT earned", (() => {
  return !deriveBadges({ womenLed: false }).find((x) => x.key === "women_led")!.earned;
})());
check("earnedBadges returns only earned, in order", (() => {
  const e = earnedBadges({ hiring: true, fundraising: true });
  return e.length === 2 && e[0].key === "hiring" && e[1].key === "fundraising";
})());
check("locked badges carry a how-to hint", (() => {
  return deriveBadges({}).every((b) => typeof b.howTo === "string" && b.howTo.length > 0);
})());

// ---- 4.
section("Workflow: dashboard step modules mirror the form config");
const cfg: FormConfig = [
  {
    id: "s1", key: "identity", title: "Startup", subtitle: "Your public identity",
    step: 1, sort_order: 0, is_active: true,
    fields: [
      { id: "f0", field_key: "h", label: "H", input_type: 30, required: false, validation: {}, visible: true, sort_order: 0 },
      { id: "f1", field_key: "startup_name", label: "Name", input_type: 0, required: true, validation: {}, visible: true, sort_order: 1 },
      { id: "f2", field_key: "tagline", label: "Tagline", input_type: 0, required: false, validation: {}, visible: true, sort_order: 2 },
      { id: "f3", field_key: "secret", label: "Hidden", input_type: 0, required: false, validation: {}, visible: false, sort_order: 3 },
    ],
  },
  {
    id: "s2", key: "founders", title: "Founders & team", subtitle: "The people",
    step: 2, sort_order: 1, is_active: true,
    fields: [
      { id: "f4", field_key: "founder_bio", label: "Bio", input_type: 5, required: false, validation: {}, visible: true, sort_order: 0 },
    ],
  },
];
check("one module per step (2 steps)", computeFormModules(cfg, {}).length === 2);
check("module title + subtitle come from the section", (() => {
  const m = computeFormModules(cfg, {})[0];
  return m.title === "Startup" && m.subtitle === "Your public identity";
})());
check("headings + hidden fields excluded from count (2 visible value fields)", (() => {
  return computeFormModules(cfg, {})[0].total === 2;
})());
check("filled count reflects data", (() => {
  const m = computeFormModules(cfg, { startup_name: "Acme" })[0];
  return m.filled === 1 && m.percent === 50;
})());
check("step index is 0-based for ?step= deep link", computeFormModules(cfg, {})[1].step === 1);

// ---- 5.
section("Edge cases: completion engine robustness");
check("computeCompletion(null) → 0%, no crash", computeCompletion(null).percent === 0);
check("computeCompletion(undefined) → 0%, no crash", computeCompletion(undefined).percent === 0);
check("location any-of: hq_country only (no hq_city) still satisfies Draft", (() => {
  const c = computeCompletion({ startup_name: "A", primary_sector: "F", stage: "Series A", hq_country: "UK", tagline: "t" });
  return c.percent === 25;
})());
check("cumulative gate: all public fields but missing a Draft field (tagline) → gate CLOSED", (() => {
  const noTagline = { ...publicReady } as Record<string, unknown>;
  delete noTagline.tagline;
  const c = computeCompletion(noTagline);
  return c.publicProfileMet === false; // public own-fields met, but Draft incomplete
})());
check("presence-based: a too-short description still counts for completion (length is the form's job)", (() => {
  return computeCompletion({ ...publicReady, description: "short" }).publicProfileMet === true;
})());
check("falsy values don't count: empty string / [] / false / whitespace are unfilled", (() => {
  // tagline whitespace, sector empty → Draft not met → < 25%
  const c = computeCompletion({ startup_name: "A", primary_sector: "", stage: "Series A", hq_city: "K", tagline: "   " });
  return c.percent === 0;
})());
check("100% data is idempotent (recompute equal)", (() => {
  return computeCompletion(investorReady).percent === computeCompletion({ ...investorReady }).percent;
})());

section("Edge cases: review stage derivation");
check("unknown status → submitted (safe default)", deriveStage({ submitted: true, status: "weird_value" }) === "submitted");
check("case-insensitive status ('Approved')", deriveStage({ submitted: true, status: "Approved" }) === "approved");
check("submitted with no status → submitted", deriveStage({ submitted: true }) === "submitted");
check("featured without verified still → featured", deriveStage({ submitted: true, status: "approved", featuredActive: true }) === "featured");
check("not submitted wins even if flags set", deriveStage({ submitted: false, pashaVerified: true, featuredActive: true }) === "draft");

section("Edge cases: badges coercion");
check("isYes uppercase + trailing space ('YES ')", isYes("YES ") === true);
check("isYes does NOT coerce numbers (1)", isYes(1) === false);
check("isYes(null/{}/[]) → false", !isYes(null) && !isYes({}) && !isYes([]));
check("deriveBadges({}) → nothing earned", deriveBadges({}).every((b) => !b.earned));
check("earnedBadges({}) → []", earnedBadges({}).length === 0);
check("null flags treated as not-earned", deriveBadges({ womenLed: null, hiring: null }).every((b) => !b.earned));

section("Edge cases: form modules");
const cityVal = 91, groupVal = 20, headingVal = 30, numberVal = 4, textVal = 0;
const edgeCfg: FormConfig = [
  { id: "e0", key: "empties", title: "Empties", subtitle: "", step: 1, sort_order: 0, is_active: true,
    fields: [{ id: "h", field_key: "h", label: "H", input_type: headingVal, required: false, validation: {}, visible: true, sort_order: 0 }] },
  { id: "e1", key: "loc", title: "Location", subtitle: "", step: 2, sort_order: 0, is_active: true,
    fields: [{ id: "c", field_key: "location", label: "HQ", input_type: cityVal, required: false, validation: {}, visible: true, sort_order: 0 }] },
  { id: "e2", key: "team", title: "Team", subtitle: "", step: 3, sort_order: 0, is_active: true,
    fields: [{ id: "g", field_key: "founders", label: "Founders", input_type: groupVal, required: false, validation: {}, visible: true, sort_order: 0 }] },
  { id: "e3", key: "vals", title: "Vals", subtitle: "", step: 4, sort_order: 0, is_active: true,
    fields: [
      { id: "v1", field_key: "n0", label: "n0", input_type: numberVal, required: false, validation: {}, visible: true, sort_order: 0 },
      { id: "v2", field_key: "s_empty", label: "se", input_type: textVal, required: false, validation: {}, visible: true, sort_order: 1 },
      { id: "v3", field_key: "s_ws", label: "sw", input_type: textVal, required: false, validation: {}, visible: true, sort_order: 2 },
    ] },
  { id: "e4", key: "inactive", title: "Inactive", subtitle: "", step: 5, sort_order: 0, is_active: false,
    fields: [{ id: "x", field_key: "x", label: "x", input_type: textVal, required: false, validation: {}, visible: true, sort_order: 0 }] },
];
check("empty config → no modules", computeFormModules([], {}).length === 0);
check("heading-only step → total 0, percent 0 (no NaN/divide-by-zero)", (() => {
  const m = computeFormModules(edgeCfg, {})[0];
  return m.total === 0 && m.percent === 0 && !Number.isNaN(m.percent);
})());
check("CITY_COMPOSITE counts as filled via hq_country", (() => {
  const m = computeFormModules(edgeCfg, { hq_country: "UK" }).find((x) => x.title === "Location")!;
  return m.filled === 1 && m.total === 1;
})());
check("founders group filled only when an entry has data", (() => {
  const empty = computeFormModules(edgeCfg, { founders: [] }).find((x) => x.title === "Team")!;
  const blank = computeFormModules(edgeCfg, { founders: [{}] }).find((x) => x.title === "Team")!;
  const named = computeFormModules(edgeCfg, { founders: [{ name: "A" }] }).find((x) => x.title === "Team")!;
  return empty.filled === 0 && blank.filled === 0 && named.filled === 1;
})());
check("numeric 0 is filled; '' and whitespace are not", (() => {
  const m = computeFormModules(edgeCfg, { n0: 0, s_empty: "", s_ws: "   " }).find((x) => x.title === "Vals")!;
  return m.filled === 1 && m.total === 3; // only n0 counts
})());
check("inactive section excluded from modules", (() => {
  return !computeFormModules(edgeCfg, {}).some((m) => m.title === "Inactive");
})());

// ---- Summary -----------------------------------------------------------------
console.log(`\n──────────────\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
