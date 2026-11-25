import type { Route } from "@/state/store";

export interface TourStep {
  route: Route;
  target: string;
  title: string;
  body: string;
  why?: string;
  tryIt?: string;
  placement?: "bottom" | "top" | "right" | "left";
}

export const TOUR_STEPS: TourStep[] = [
  {
    route: "sources",
    target: "source-cards",
    title: "Connect your channels",
    body: "Your sales data lives in five different places. Reuse existing Shopify and Amazon connectors, and ingest quick-commerce reports through dedicated file folders.",
    why: "Extraction is mostly solved. Each card is honest about what is a working connector, what is a file drop, and what is still unverified.",
    placement: "bottom",
  },
  {
    route: "model",
    target: "definition-controls",
    title: "Define one sales metric",
    body: "A successful pipeline does not guarantee comparable sales. Decide whose sale it is, when it counts and what amount counts.",
    why: "Without one definition, ₹1 on Blinkit and ₹1 on Shopify don't mean the same thing.",
    tryIt: "change the discount treatment and watch the weekly total recalculate.",
    placement: "right",
  },
  {
    route: "model",
    target: "sku-mapping",
    title: "Normalize products and locations",
    body: "A six-pack and six individual packets represent the same product volume. Normalize product identifiers, pack sizes and available geography.",
    why: "Packet equivalents let the founder compare volume across pack formats and channels.",
    tryIt: "map Zepto MC-PACK6 to Masala Chips × 6.",
    placement: "top",
  },
  {
    route: "quality",
    target: "exception-queue",
    title: "Resolve data-quality exceptions",
    body: "Missing data is not zero sales. Detect missing reports, duplicate records and unmapped products before publishing.",
    why: "Report readiness updates after every action, so the analyst knows exactly what stands between them and Monday 9 AM.",
    placement: "top",
  },
  {
    route: "reconciliation",
    target: "bridge",
    title: "Understand the number",
    body: "See exactly why the raw channel totals differ from comparable consumer sales.",
    why: "Every step links to the source records, the transformation rule and its evidence status — so the founder can trust the number.",
    tryIt: "click any bar to open its lineage.",
    placement: "bottom",
  },
  {
    route: "reports",
    target: "report-delivery",
    title: "Deliver the Monday report",
    body: "The founder receives a trusted weekly number, growth drivers, product and city breakdowns, and transparent coverage information.",
    why: "Revisions are versioned, so a Tuesday refund never silently rewrites Monday's number.",
    placement: "left",
  },
];
