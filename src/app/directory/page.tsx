import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { DirectoryClient } from "./DirectoryClient";
import { DirectoryHero } from "@/components/directory/DirectoryHero";
import { createServiceClient } from "@/lib/supabase/server";
import { DUMMY_STARTUPS } from "@/lib/dummy-startups";

export const metadata: Metadata = {
  title: "Directory",
  description:
    "P@SHA Startup Directory — browse 2,481 startups across cities and sectors. Maintained by the Pakistan Software Houses Association (P@SHA).",
  alternates: { canonical: "/directory" },
  openGraph: {
    title: "Directory · P@SHA Startup Community",
    url: "/directory",
  },
  twitter: {
    title: "Directory · P@SHA Startup Community",
  },
};

export const revalidate = 60;

async function loadInitial() {
  try {
    const supabase = createServiceClient();
    // Fetch ALL 2,481 startups. Supabase REST defaults to 1000-row cap so we
    // paginate the .range() to assemble the full list. Each row is small
    // (~400 bytes), so 2,481 rows is ~1MB JSON — acceptable for a directory.
    const PAGE = 1000;
    let from = 0;
    type Row = {
      id: string;
      startup_name: string;
      tagline: string | null;
      primary_industry: string | null;
      nic_name: string | null;
      city: string | null;
      website: string | null;
      logo_url: string | null;
      current_revenue: number | null;
      investment_raised: number | null;
      number_of_customers: number | null;
      total_employees: number | null;
      pasha_verified: boolean | null;
    };
    const allRows: Row[] = [];
    let total = 0;
    // Try the full select (including pasha_verified). If the column doesn't
    // exist yet (pre-migration), fall back to the legacy select so the page
    // still renders all rows — the badge just won't show until the column
    // is added.
    // Column sets ordered from richest to most compatible.
    // Each set falls back to the next on any column-not-found error.
    // Note: founder_name/role/photo are NOT direct columns on the databank
    // listing table — they live in key_persons on the detail page.
    const COLUMN_SETS = [
      "id,startup_name,tagline,startup_idea,primary_industry,nic_name,city,website,logo_url,current_revenue,investment_raised,number_of_customers,total_employees,female_employees,pasha_verified,founded_date,product_stage,business_types,incubation_stage,jobs_created",
      "id,startup_name,tagline,startup_idea,primary_industry,nic_name,city,website,logo_url,current_revenue,investment_raised,number_of_customers,total_employees,pasha_verified,founded_date,product_stage,business_types,incubation_stage",
      "id,startup_name,tagline,primary_industry,nic_name,city,website,logo_url,current_revenue,investment_raised,number_of_customers,total_employees,pasha_verified,founded_date,product_stage",
      "id,startup_name,tagline,primary_industry,nic_name,city,website,logo_url,current_revenue,investment_raised,number_of_customers,total_employees,pasha_verified",
      "id,startup_name,tagline,primary_industry,nic_name,city,website,logo_url,current_revenue,investment_raised,number_of_customers,total_employees",
    ];
    let columnIdx = 0;
    let columns = COLUMN_SETS[0];
    while (true) {
      const { data, count, error } = await supabase
        .from("databank")
        // Sort: verified rows first (so the trusted set pins to the top),
        // then newest first (so freshly-approved submissions surface
        // immediately), then by revenue (keeps the original visual feel for
        // the long tail of unverified rows that all share a similar
        // created_at).
        .select(columns, { count: "exact" })
        .order("pasha_verified", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false, nullsFirst: false })
        .order("current_revenue", { ascending: false, nullsFirst: false })
        .range(from, from + PAGE - 1);
      if (error) {
        // Try the next (more compatible) column set on any column error.
        if (columnIdx < COLUMN_SETS.length - 1) {
          columnIdx++;
          columns = COLUMN_SETS[columnIdx];
          from = 0;
          allRows.length = 0;
          continue;
        }
        break;
      }
      total = count ?? total;
      if (!data || data.length === 0) break;
      allRows.push(...(data as unknown as Row[]));
      if (data.length < PAGE) break;
      from += PAGE;
    }

    const { data: sectors } = await supabase
      .from("databank")
      .select("primary_industry")
      .not("primary_industry", "is", null);
    const uniqueSectors = Array.from(
      new Set(
        (sectors ?? [])
          .map((r) => r.primary_industry)
          .filter((s): s is string => !!s)
      )
    ).sort();

    return {
      rows: allRows,
      total: total || allRows.length,
      sectors: uniqueSectors,
    };
  } catch {
    return { rows: [], total: 0, sectors: [] };
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _INLINE_DUMMY_UNUSED = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    startup_name: "Bazaar Technologies",
    tagline: "Digitising Pakistan's retail supply chain for kiryana stores",
    primary_industry: "E-Commerce",
    nic_name: "LUMS CE",
    city: "Karachi",
    website: "https://bazaar.pk",
    logo_url: "https://logo.clearbit.com/bazaartech.com",
    founder_name: "Hamza Jawaid",
    founder_role: "Co-founder & Co-CEO",
    founder_photo_url: "https://randomuser.me/api/portraits/men/32.jpg",
    current_revenue: 120_000_000,
    investment_raised: 30_000_000,
    number_of_customers: 85000,
    total_employees: 420,
    pasha_verified: true,
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    startup_name: "Airlift Technologies",
    tagline: "On-demand mass transit and last-mile logistics",
    primary_industry: "Transport & Logistics",
    nic_name: "NIC Lahore",
    city: "Lahore",
    website: "https://airlift.pk",
    logo_url: "https://logo.clearbit.com/airlift.com",
    founder_name: "Usman Gul",
    founder_role: "Founder & CEO",
    founder_photo_url: "https://randomuser.me/api/portraits/men/45.jpg",
    current_revenue: 80_000_000,
    investment_raised: 85_000_000,
    number_of_customers: 200000,
    total_employees: 550,
    pasha_verified: true,
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    startup_name: "Meezan FinTech",
    tagline: "Shariah-compliant digital banking for the unbanked",
    primary_industry: "FinTech",
    nic_name: "IBA Karachi",
    city: "Karachi",
    website: "https://meezanfintech.pk",
    logo_url: "https://logo.clearbit.com/meezanbank.com",
    founder_name: "Ayesha Khan",
    founder_role: "Founder & CEO",
    founder_photo_url: "https://randomuser.me/api/portraits/women/44.jpg",
    current_revenue: 45_000_000,
    investment_raised: 12_000_000,
    number_of_customers: 310000,
    total_employees: 180,
    pasha_verified: false,
  },
  {
    id: "00000000-0000-0000-0000-000000000004",
    startup_name: "Sabzbari",
    tagline: "Farm-to-table fresh produce delivery in 90 minutes",
    primary_industry: "AgriTech",
    nic_name: "NUST NIC",
    city: "Islamabad",
    website: "https://sabzbari.pk",
    logo_url: "https://logo.clearbit.com/freshdirect.com",
    founder_name: "Bilal Ahmed",
    founder_role: "Co-founder",
    founder_photo_url: "https://randomuser.me/api/portraits/men/52.jpg",
    current_revenue: 18_000_000,
    investment_raised: 5_000_000,
    number_of_customers: 22000,
    total_employees: 95,
    pasha_verified: false,
  },
  {
    id: "00000000-0000-0000-0000-000000000005",
    startup_name: "Sehat Kahani",
    tagline: "Connecting patients to female doctors via telemedicine",
    primary_industry: "HealthTech",
    nic_name: "Plan9",
    city: "Karachi",
    website: "https://sehatkahani.com",
    logo_url: "https://logo.clearbit.com/sehatkahani.com",
    founder_name: "Dr. Sara Saeed",
    founder_role: "Co-founder & CEO",
    founder_photo_url: "https://randomuser.me/api/portraits/women/68.jpg",
    current_revenue: 28_000_000,
    investment_raised: 7_500_000,
    number_of_customers: 60000,
    total_employees: 130,
    pasha_verified: true,
  },
  {
    id: "00000000-0000-0000-0000-000000000006",
    startup_name: "TalentX",
    tagline: "AI-powered hiring platform for Pakistan's tech talent",
    primary_industry: "HR Tech",
    nic_name: "NIC Lahore",
    city: "Lahore",
    website: "https://talentx.pk",
    logo_url: "https://logo.clearbit.com/lever.co",
    founder_name: "Zainab Iqbal",
    founder_role: "Founder",
    founder_photo_url: "https://randomuser.me/api/portraits/women/22.jpg",
    current_revenue: 9_000_000,
    investment_raised: 2_000_000,
    number_of_customers: 1200,
    total_employees: 48,
    pasha_verified: false,
  },
  {
    id: "00000000-0000-0000-0000-000000000007",
    startup_name: "CreditBook",
    tagline: "Digital ledger & credit scoring for small businesses",
    primary_industry: "FinTech",
    nic_name: "LUMS CE",
    city: "Karachi",
    website: "https://creditbook.pk",
    logo_url: "https://logo.clearbit.com/creditbook.pk",
    founder_name: "Hisham Adamjee",
    founder_role: "Co-founder & CEO",
    founder_photo_url: "https://randomuser.me/api/portraits/men/14.jpg",
    current_revenue: 55_000_000,
    investment_raised: 11_000_000,
    number_of_customers: 4_500_000,
    total_employees: 210,
    pasha_verified: true,
  },
  {
    id: "00000000-0000-0000-0000-000000000008",
    startup_name: "Tez Financial",
    tagline: "Instant digital loans for micro-entrepreneurs",
    primary_industry: "FinTech",
    nic_name: null,
    city: "Lahore",
    website: "https://tezfinancial.pk",
    logo_url: "https://logo.clearbit.com/tez.com",
    founder_name: "Naureen Hyat",
    founder_role: "Co-founder",
    founder_photo_url: "https://randomuser.me/api/portraits/women/55.jpg",
    current_revenue: 62_000_000,
    investment_raised: 18_000_000,
    number_of_customers: 150000,
    total_employees: 175,
    pasha_verified: false,
  },
  {
    id: "00000000-0000-0000-0000-000000000009",
    startup_name: "Farmdar",
    tagline: "Satellite & AI crop monitoring for Pakistani farmers",
    primary_industry: "AgriTech",
    nic_name: "NUST NIC",
    city: "Islamabad",
    website: "https://farmdar.com",
    logo_url: "https://logo.clearbit.com/farmdar.com",
    founder_name: "Talha Khan",
    founder_role: "Founder & CEO",
    founder_photo_url: "https://randomuser.me/api/portraits/men/77.jpg",
    current_revenue: 7_000_000,
    investment_raised: 3_200_000,
    number_of_customers: 8000,
    total_employees: 42,
    pasha_verified: false,
  },
  {
    id: "00000000-0000-0000-0000-000000000010",
    startup_name: "OneLoad",
    tagline: "Largest digital payments & branchless banking network",
    primary_industry: "FinTech",
    nic_name: null,
    city: "Karachi",
    website: "https://oneload.pk",
    logo_url: "https://logo.clearbit.com/oneload.pk",
    founder_name: "Muhammad Yar",
    founder_role: "Founder & CEO",
    founder_photo_url: "https://randomuser.me/api/portraits/men/41.jpg",
    current_revenue: 400_000_000,
    investment_raised: 25_000_000,
    number_of_customers: 1_200_000,
    total_employees: 380,
    pasha_verified: true,
  },
  {
    id: "00000000-0000-0000-0000-000000000011",
    startup_name: "Educative.io PK",
    tagline: "Interactive coding courses built for Pakistani developers",
    primary_industry: "EdTech",
    nic_name: "Plan9",
    city: "Lahore",
    website: "https://educative.io",
    logo_url: "https://logo.clearbit.com/educative.io",
    founder_name: "Fahim Ul Haq",
    founder_role: "Co-founder & CEO",
    founder_photo_url: "https://randomuser.me/api/portraits/men/63.jpg",
    current_revenue: 35_000_000,
    investment_raised: 8_000_000,
    number_of_customers: 75000,
    total_employees: 110,
    pasha_verified: false,
  },
  {
    id: "00000000-0000-0000-0000-000000000012",
    startup_name: "Markaz",
    tagline: "Social commerce — sell anything without a shop",
    primary_industry: "E-Commerce",
    nic_name: "NIC Lahore",
    city: "Lahore",
    website: "https://markaz.app",
    logo_url: "https://logo.clearbit.com/markaz.app",
    founder_name: "Rohan Khurram",
    founder_role: "Co-founder & CEO",
    founder_photo_url: "https://randomuser.me/api/portraits/men/29.jpg",
    current_revenue: 22_000_000,
    investment_raised: 9_000_000,
    number_of_customers: 500000,
    total_employees: 85,
    pasha_verified: false,
  },
] as const;

export default async function DirectoryPage() {
  let initial = await loadInitial();

  // Fall back to dummy data when no real DB is connected yet.
  if (initial.rows.length === 0) {
    const rows = DUMMY_STARTUPS.map((s) => ({ ...s }));
    const uniqueSectors = Array.from(
      new Set(rows.map((r) => r.primary_industry).filter(Boolean))
    ).sort() as string[];
    initial = { rows, total: rows.length, sectors: uniqueSectors };
  }
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <DirectoryHero
          totalStartups={initial.total}
          sectorCount={initial.sectors.length}
        />
        <section className="bg-white border-t border-pasha-line">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 py-12 sm:py-16">
            <Suspense fallback={<div className="text-pasha-muted">Loading…</div>}>
              <DirectoryClient initial={initial} />
            </Suspense>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
