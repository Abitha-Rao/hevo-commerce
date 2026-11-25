/**
 * Deterministic data-quality validation. Exceptions are derived from workspace
 * state + canonical records — there is no AI inference anywhere in this module.
 */
import type { ChannelId, Scenario, SkuMapping, WeekId } from "@/data/types";
import { CHANNELS } from "@/data/channels";
import { DEFAULT_SKU_MAPPINGS, mappingKey, productName } from "@/data/catalog";
import { ingestWeek } from "./adapters";
import { rupees } from "./format";

export type Severity = "blocking" | "warning" | "info";
export type ExceptionStatus = "open" | "resolved" | "acknowledged" | "excluded";
export type ExceptionType =
  | "missing_file"
  | "duplicate"
  | "unmapped_sku"
  | "missing_field"
  | "unsupported_granularity"
  | "late_adjustment";

export type ExceptionAction =
  | "upload_blinkit_sellout"
  | "upload_instamart_orderdate"
  | "upload_instamart_returns"
  | "exclude_source"
  | "remove_duplicate"
  | "map_sku"
  | "acknowledge"
  | "view_revision";

export interface DQException {
  id: string;
  type: ExceptionType;
  severity: Severity;
  source: ChannelId;
  title: string;
  description: string;
  impact: string;
  owner: string;
  actions: ExceptionAction[];
  status: ExceptionStatus;
  resolutionNote?: string;
  sku?: string;
}

export interface Resolution {
  status: Exclude<ExceptionStatus, "open">;
  at: string;
  note: string;
}

export interface DQInput {
  week: WeekId;
  scenario: Scenario;
  mappings: SkuMapping[];
  resolutions: Record<string, Resolution>;
  instamartReturnsReceived: boolean;
}

export const TYPE_LABEL: Record<ExceptionType, string> = {
  missing_file: "Missing file",
  duplicate: "Duplicate / overlapping period",
  unmapped_sku: "Unmapped SKU",
  missing_field: "Missing required field",
  unsupported_granularity: "Unsupported granularity",
  late_adjustment: "Late financial adjustment",
};

export function deriveExceptions(input: DQInput): DQException[] {
  if (input.week !== "W47") return [];
  const { scenario, mappings, resolutions } = input;
  const records = ingestWeek("W47");
  const list: Omit<DQException, "status">[] = [];

  if (!scenario.blinkitSellOut)
    list.push({
      id: "missing-blinkit-sellout",
      type: "missing_file",
      severity: "blocking",
      source: "blinkit",
      title: "Blinkit sell-out report not received for 16–22 Nov",
      description: "Expected one file in /commerce/blinkit/sell-out/. Only the wholesale invoice folder has data for this week.",
      impact: "Blinkit consumer sales are unknown — not zero. Coverage drops to 4 of 5 channels; sell-in stays separate.",
      owner: "Ananya · Analyst",
      actions: ["upload_blinkit_sellout", "exclude_source"],
    });

  if (!scenario.instamartOrderDate)
    list.push({
      id: "granularity-instamart-orderdate",
      type: "unsupported_granularity",
      severity: "blocking",
      source: "instamart",
      title: "Instamart report is delivery-date only",
      description: "The received file places orders by delivery date. The sales definition recognises sales by original order date.",
      impact: "Instamart cannot be compared on an order-date basis and is excluded from the comparable total until an order-date export arrives.",
      owner: "Ananya · Analyst",
      actions: ["upload_instamart_orderdate", "exclude_source"],
    });

  const dups = records.filter((r) => r.duplicateOf);
  for (const d of dups)
    list.push({
      id: `dup-${d.sourceChannel}-${d.ref}`,
      type: "duplicate",
      severity: "blocking",
      source: d.sourceChannel,
      title: `Duplicate ${CHANNELS[d.sourceChannel].short} order ${d.ref} in overlapping report periods`,
      description: `Order ${d.sourceRecordId.split(":")[0]} appears in ${d.duplicateOf} and ${d.sourceFile.replace(/.*\//, "")} (periods overlap 20–22 Nov).`,
      impact: `Would double-count ${rupees(d.grossMerchandiseValue - d.customerDiscount)}. The copy is held out of the model until resolved.`,
      owner: "Ananya · Analyst",
      actions: ["remove_duplicate"],
    });

  const resolvedMaps: Record<string, string> = {};
  const unmapped = DEFAULT_SKU_MAPPINGS.filter((d) => !d.canonicalProductId || !mappings.find((m) => mappingKey(m) === mappingKey(d))?.canonicalProductId)
    .map((d) => mappings.find((m) => mappingKey(m) === mappingKey(d)) ?? d);
  for (const d of DEFAULT_SKU_MAPPINGS.filter((x) => !x.canonicalProductId)) {
    const cur = mappings.find((m) => mappingKey(m) === mappingKey(d));
    if (cur?.canonicalProductId) resolvedMaps[`unmapped-${d.channel}-${d.sourceSku}`] = `Mapped to ${productName(cur.canonicalProductId)} × ${cur.packetMultiplier}; packet equivalents recalculated.`;
  }
  for (const m of unmapped) {
    const rows = records.filter((r) => mappingKey({ channel: r.sourceChannel, sourceSku: r.sourceSku }) === mappingKey(m));
    if (!rows.length) continue;
    const units = rows.reduce((s, r) => s + r.sellingUnits, 0);
    const value = rows.reduce((s, r) => s + r.grossMerchandiseValue - r.customerDiscount, 0);
    list.push({
      id: `unmapped-${m.channel}-${m.sourceSku}`,
      type: "unmapped_sku",
      severity: "warning",
      source: m.channel,
      sku: m.sourceSku,
      title: `${CHANNELS[m.channel].short} SKU ${m.sourceSku} is not mapped to a canonical product`,
      description: `"${m.sourceName}" — ${units} selling unit${units === 1 ? "" : "s"} in ${rows.map((r) => r.ref).join(", ")}.`,
      impact: `${rupees(value)} counts at channel level but cannot be attributed to a product, and packet equivalents are incomplete.`,
      owner: "Rohan · Category ops",
      actions: ["map_sku"],
    });
  }

  list.push({
    id: "missing-instamart-returns",
    type: "missing_file",
    severity: "warning",
    source: "instamart",
    title: "Instamart returns report not received for 16–22 Nov",
    description: "Expected one file in /commerce/instamart/returns/.",
    impact: "Returns are unknown, not zero. Instamart sell-out may be overstated until the file arrives.",
    owner: "Ananya · Analyst",
    actions: ["upload_instamart_returns"],
  });

  list.push({
    id: "geo-zepto",
    type: "unsupported_granularity",
    severity: "warning",
    source: "zepto",
    title: "Zepto download has no city dimension",
    description: "City analytics are documented through paid Atom, which is not active for this workspace.",
    impact: "Zepto sales appear as Unknown geography. City values are never inferred.",
    owner: "Ananya · Analyst",
    actions: ["acknowledge"],
  });

  const stateOnly = records.filter((r) => r.geoGranularity === "state" && !r.duplicateOf);
  for (const r of stateOnly)
    list.push({
      id: `field-${r.sourceChannel}-${r.ref}-city`,
      type: "missing_field",
      severity: "info",
      source: r.sourceChannel,
      title: `${CHANNELS[r.sourceChannel].short} order ${r.ref} is missing ship-city`,
      description: `Only ship-state (${r.state}) is present.`,
      impact: `Reported under "${r.state} (state only)". Not allocated to any city.`,
      owner: "Ananya · Analyst",
      actions: ["acknowledge"],
    });

  const late = records.filter((r) => r.transactionType === "refund" && r.ingestedAt > "2026-11-23T09:00:00+05:30");
  for (const r of late)
    list.push({
      id: `late-${r.ref}`,
      type: "late_adjustment",
      severity: "info",
      source: r.sourceChannel,
      title: `Refund on ${r.parentRef} arrived after the Monday 9:00 AM cutoff`,
      description: `₹${r.refund} partial refund issued ${new Date(r.adjustmentDate!).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}.`,
      impact: "Restated to the original order week as revision v2. The Monday snapshot (v1) is preserved.",
      owner: "Ananya · Analyst",
      actions: ["view_revision", "acknowledge"],
    });

  return list.map((e) => {
    // Some exceptions resolve themselves when the underlying state changes.
    if (e.id === "missing-instamart-returns" && input.instamartReturnsReceived)
      return { ...e, status: "resolved", resolutionNote: "File received: 0 return rows — confirmed zero returns (not missing)." };
    if (resolvedMaps[e.id]) return { ...e, status: "resolved" as const, resolutionNote: resolvedMaps[e.id] };
    const r = resolutions[e.id];
    return r ? { ...e, status: r.status, resolutionNote: r.note } : { ...e, status: "open" as const };
  });
}

export type Readiness = "blocked" | "disclosures" | "ready";

export function readinessOf(list: DQException[]): { state: Readiness; blocking: number; warnings: number; open: number } {
  const open = list.filter((e) => e.status === "open");
  const blocking = open.filter((e) => e.severity === "blocking").length;
  const warnings = open.filter((e) => e.severity === "warning").length;
  return { state: blocking ? "blocked" : warnings ? "disclosures" : "ready", blocking, warnings, open: open.length };
}

export const READINESS_LABEL: Record<Readiness, string> = {
  blocked: "Blocked",
  disclosures: "Ready with disclosures",
  ready: "Ready to publish",
};
