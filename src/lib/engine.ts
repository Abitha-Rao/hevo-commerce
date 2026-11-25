/**
 * Normalization + reporting engine.
 *
 * ingest (adapters) → canonical records → apply sales definition, scenario, SKU mapping
 * → normalized lines → channel / product / city aggregates → Normalization Bridge.
 *
 * Nothing in the UI is hardcoded: every total comes from computeWeekReport().
 */
import type {
  CanonicalSalesRecord,
  ChannelId,
  GeoGranularity,
  Scenario,
  SalesDefinition,
  SkuMapping,
  WeekId,
  Snapshot,
} from "@/data/types";
import { CHANNEL_IDS } from "@/data/types";
import { CHANNELS } from "@/data/channels";
import { mappingKey, productName } from "@/data/catalog";
import { ADAPTERS, WEEKS, ingestWeek, inWeek } from "./adapters";

/* ------------------------------------------------------------------ */
/* Snapshots                                                           */
/* ------------------------------------------------------------------ */

export const SNAPSHOTS: Record<WeekId, Record<Snapshot, { asOf: string; label: string; version: string }>> = {
  W47: {
    monday: { asOf: "2026-11-23T08:45:00+05:30", label: "Monday snapshot", version: "v1" },
    tuesday: { asOf: "2026-11-24T18:00:00+05:30", label: "Revised after Tuesday refund", version: "v2" },
  },
  W46: {
    monday: { asOf: "2026-11-16T08:45:00+05:30", label: "Final", version: "v1" },
    tuesday: { asOf: "2026-11-16T08:45:00+05:30", label: "Final", version: "v1" },
  },
};

export interface EngineInput {
  week: WeekId;
  scenario: Scenario;
  definition: SalesDefinition;
  mappings: SkuMapping[];
  /** Channels the analyst explicitly excluded (acknowledged) from the comparable total. */
  excludedByAnalyst: Partial<Record<ChannelId, boolean>>;
}

/* ------------------------------------------------------------------ */
/* Definition support                                                  */
/* ------------------------------------------------------------------ */

export interface UnsupportedNote {
  control: string;
  selected: string;
  reason: string;
}

export function definitionSupport(def: SalesDefinition): UnsupportedNote[] {
  const notes: UnsupportedNote[] = [];
  if (def.reportingPeriod === "sun_sat_ist")
    notes.push({
      control: "Reporting period",
      selected: "Sunday–Saturday (IST)",
      reason: "Synthetic data and prior-week baseline exist only for Monday–Sunday IST weeks. Reports continue to use Monday–Sunday.",
    });
  if (def.reportingPeriod === "calendar_month")
    notes.push({
      control: "Reporting period",
      selected: "Calendar month",
      reason: "Monthly periods are a future capability (paired with the GST cross-check). Reports continue to use Monday–Sunday.",
    });
  if (def.recognitionDate === "delivery_date")
    notes.push({
      control: "Sales recognition date",
      selected: "Delivery date",
      reason: "Blinkit sell-out and Zepto exports do not carry delivery timestamps (unverified). Reports continue to use order date.",
    });
  if (def.recognitionDate === "settlement_date")
    notes.push({
      control: "Sales recognition date",
      selected: "Settlement date",
      reason: "Settlement data is only available for Amazon; quick-commerce settlements are out of scope. Reports continue to use order date.",
    });
  return notes;
}

/* ------------------------------------------------------------------ */
/* Normalized lines                                                    */
/* ------------------------------------------------------------------ */

export type LineStatus =
  | "included"
  | "cancelled"
  | "sell_in"
  | "duplicate"
  | "not_in_snapshot"
  | "source_unavailable"
  | "adjustment_period";

export interface NormalizedLine {
  record: CanonicalSalesRecord;
  status: LineStatus;
  canonicalProductId: string | null;
  packetMultiplier: number | null;
  packetEquivalents: number | null;
  normalizedSales: number;
  discountAddBack: number;
  treatment: string;
}

function mappingFor(r: CanonicalSalesRecord, mappings: SkuMapping[]) {
  return mappings.find((m) => mappingKey(m) === mappingKey({ channel: r.sourceChannel, sourceSku: r.sourceSku }));
}

function addBack(r: CanonicalSalesRecord, def: SalesDefinition): number {
  if (!r.customerDiscount) return 0;
  if (def.discountTreatment === "before_all") return r.customerDiscount;
  if (def.discountTreatment === "before_platform" && r.discountFundedBy === "platform") return r.customerDiscount;
  return 0;
}

export function normalizeLines(input: EngineInput): NormalizedLine[] {
  const { week, scenario, definition, mappings } = input;
  const snap = SNAPSHOTS[week][week === "W47" ? scenario.snapshot : "monday"];
  const asOf = new Date(snap.asOf).getTime();
  const gate = {
    blinkit_sellout: week === "W47" ? scenario.blinkitSellOut : true,
    instamart_order_date: week === "W47" ? scenario.instamartOrderDate : true,
  };

  return ingestWeek(week).map((r) => {
    const m = mappingFor(r, mappings);
    const mult = m?.canonicalProductId ? m.packetMultiplier : null;
    const productId = m?.canonicalProductId ?? null;
    const units = r.transactionType === "refund" ? -r.refundUnits : r.sellingUnits;
    const packets = mult ? units * mult : null;
    const lineBase = { record: r, canonicalProductId: productId, packetMultiplier: mult, discountAddBack: 0 };

    if (r.duplicateOf)
      return { ...lineBase, status: "duplicate", packetEquivalents: null, normalizedSales: 0, treatment: `Duplicate of row in ${r.duplicateOf}; held out of the model` };
    if (new Date(r.ingestedAt).getTime() > asOf)
      return { ...lineBase, status: "not_in_snapshot", packetEquivalents: null, normalizedSales: 0, treatment: `Arrived ${new Date(r.ingestedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}, after this snapshot` };
    if (r.gatedBy && !gate[r.gatedBy])
      return { ...lineBase, status: "source_unavailable", packetEquivalents: null, normalizedSales: 0, treatment: "Source report unavailable — excluded, not zero" };
    if (r.metric === "sell_in")
      return { ...lineBase, status: "sell_in", packetEquivalents: packets, normalizedSales: 0, treatment: "Wholesale sell-in — reported separately, never added to sell-out" };

    if (r.transactionType === "refund") {
      if (definition.refundTreatment === "adjustment_period")
        return { ...lineBase, status: "adjustment_period", packetEquivalents: null, normalizedSales: 0, treatment: "Refund booked to the week it occurred (23–29 Nov)" };
      return { ...lineBase, status: "included", packetEquivalents: packets, normalizedSales: -r.refund, treatment: "Known refund restated to the original order week" };
    }

    if (r.cancelledAt && inWeek(r.cancelledAt, week))
      return { ...lineBase, status: "cancelled", packetEquivalents: 0, normalizedSales: 0, treatment: "Cancelled within the reporting week — excluded" };

    const ab = addBack(r, definition);
    const value = r.grossMerchandiseValue - r.customerDiscount + ab;
    let treatment = r.customerDiscount
      ? ab
        ? `Discount of ₹${r.customerDiscount} added back per definition`
        : `Net of ${r.discountFundedBy ?? ""}-funded discount ₹${r.customerDiscount}`.replace("  ", " ")
      : "Merchandise value, no discount";
    if (r.transactionType === "sellout_aggregate") treatment = "Consumer sell-out from Blinkit sell-out report";
    if (r.deliveryDate && !inWeek(r.deliveryDate, week) && r.orderDate && inWeek(r.orderDate, week))
      treatment = "Attributed to original order date (delivered next week)";
    return { ...lineBase, status: "included", discountAddBack: ab, packetEquivalents: packets, normalizedSales: value, treatment };
  });
}

/* ------------------------------------------------------------------ */
/* Week report                                                         */
/* ------------------------------------------------------------------ */

export type ChannelStatus = "comparable" | "excluded";

export interface ChannelResult {
  id: ChannelId;
  raw: number;
  rawBasis: string;
  status: ChannelStatus;
  excludedReason: string | null;
  excludedByAnalyst: boolean;
  normalized: number | null;
  packets: number | null;
  unmappedUnits: number;
  sellIn: number;
  sellInPackets: number;
  lines: NormalizedLine[];
}

export interface Breakdown {
  key: string;
  label: string;
  sales: number;
  packets: number;
  unmappedUnits: number;
  granularity?: GeoGranularity;
}

export type BridgeKind = "total" | "subtotal" | "delta" | "excluded";

export interface BridgeStep {
  id: string;
  label: string;
  short: string;
  kind: BridgeKind;
  value: number;
  start: number;
  end: number;
  channel: ChannelId | null;
  recordRefs: string[];
  rule: string;
  explanation: string;
  evidence: string;
  lineage: string[];
}

export interface WeekReport {
  week: WeekId;
  weekLabel: string;
  snapshot: Snapshot;
  asOf: string;
  version: string;
  versionLabel: string;
  channels: Record<ChannelId, ChannelResult>;
  comparableChannels: ChannelId[];
  excludedChannels: ChannelId[];
  rawTotal: number;
  comparableTotal: number;
  sellInTotal: number;
  sellInPackets: number;
  packets: number;
  unmappedUnits: number;
  unmappedSales: number;
  products: Breakdown[];
  cities: Breakdown[];
  bridge: BridgeStep[];
  unsupported: UnsupportedNote[];
  lines: NormalizedLine[];
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function computeWeekReport(input: EngineInput): WeekReport {
  const { week, scenario } = input;
  const snapshot: Snapshot = week === "W47" ? scenario.snapshot : "monday";
  const snap = SNAPSHOTS[week][snapshot];
  const lines = normalizeLines(input);

  const channels = {} as Record<ChannelId, ChannelResult>;
  for (const c of CHANNEL_IDS) {
    const cl = lines.filter((l) => l.record.sourceChannel === c);
    const included = cl.filter((l) => l.status === "included");
    let excludedReason: string | null = null;
    if (week === "W47" && c === "blinkit" && !scenario.blinkitSellOut)
      excludedReason = "Sell-out report not received — wholesale sell-in is not a substitute";
    if (week === "W47" && c === "instamart" && !scenario.instamartOrderDate)
      excludedReason = "Only a delivery-date report is available — not comparable with an order-date metric";
    const sellLines = cl.filter((l) => l.status === "sell_in");
    channels[c] = {
      id: c,
      raw: ADAPTERS[c].rawReportValue(week),
      rawBasis: ADAPTERS[c].rawReportBasis,
      status: excludedReason ? "excluded" : "comparable",
      excludedReason,
      excludedByAnalyst: !!excludedReason && !!input.excludedByAnalyst[c],
      normalized: excludedReason ? null : sum(included.map((l) => l.normalizedSales)),
      packets: excludedReason ? null : sum(included.map((l) => l.packetEquivalents ?? 0)),
      unmappedUnits: sum(included.filter((l) => l.packetEquivalents === null).map((l) => l.record.sellingUnits)),
      sellIn: sum(sellLines.map((l) => l.record.grossMerchandiseValue)),
      sellInPackets: sum(sellLines.map((l) => l.packetEquivalents ?? l.record.sellingUnits)),
      lines: cl,
    };
  }

  const comparableChannels = CHANNEL_IDS.filter((c) => channels[c].status === "comparable");
  const excludedChannels = CHANNEL_IDS.filter((c) => channels[c].status === "excluded");
  const included = lines.filter((l) => l.status === "included");
  const comparableTotal = sum(comparableChannels.map((c) => channels[c].normalized ?? 0));

  // Products
  const prodMap = new Map<string, Breakdown>();
  for (const l of included) {
    const key = l.canonicalProductId ?? "__unmapped";
    const b = prodMap.get(key) ?? { key, label: productName(l.canonicalProductId), sales: 0, packets: 0, unmappedUnits: 0 };
    b.sales += l.normalizedSales;
    if (l.packetEquivalents === null) b.unmappedUnits += l.record.sellingUnits;
    else b.packets += l.packetEquivalents;
    prodMap.set(key, b);
  }
  const products = [...prodMap.values()].sort((a, b) => b.sales - a.sales);

  // Cities — never infer a city from a state.
  const cityMap = new Map<string, Breakdown>();
  for (const l of included) {
    const r = l.record;
    const g = r.geoGranularity;
    const key = g === "city" ? `city:${r.city}` : g === "state" ? `state:${r.state}` : "unknown";
    const label = g === "city" ? r.city! : g === "state" ? `${r.state} (state only)` : "Unknown geography";
    const b = cityMap.get(key) ?? { key, label, sales: 0, packets: 0, unmappedUnits: 0, granularity: g };
    b.sales += l.normalizedSales;
    if (l.packetEquivalents === null) b.unmappedUnits += r.sellingUnits;
    else b.packets += l.packetEquivalents;
    cityMap.set(key, b);
  }
  const order: Record<GeoGranularity, number> = { city: 0, state: 1, unknown: 2 };
  const cities = [...cityMap.values()].sort(
    (a, b) => order[a.granularity!] - order[b.granularity!] || b.sales - a.sales,
  );

  const unmappedLines = included.filter((l) => l.packetEquivalents === null);
  const report: WeekReport = {
    week,
    weekLabel: WEEKS[week].label,
    snapshot,
    asOf: snap.asOf,
    version: snap.version,
    versionLabel: snap.label,
    channels,
    comparableChannels,
    excludedChannels,
    rawTotal: sum(CHANNEL_IDS.map((c) => channels[c].raw)),
    comparableTotal,
    sellInTotal: sum(CHANNEL_IDS.map((c) => channels[c].sellIn)),
    sellInPackets: sum(CHANNEL_IDS.map((c) => channels[c].sellInPackets)),
    packets: sum(comparableChannels.map((c) => channels[c].packets ?? 0)),
    unmappedUnits: sum(unmappedLines.map((l) => l.record.sellingUnits)),
    unmappedSales: sum(unmappedLines.map((l) => l.normalizedSales)),
    products,
    cities,
    bridge: [],
    unsupported: definitionSupport(input.definition),
    lines,
  };
  report.bridge = buildBridge(report, input);
  return report;
}

/* ------------------------------------------------------------------ */
/* Normalization Bridge                                                */
/* ------------------------------------------------------------------ */

function buildBridge(rep: WeekReport, input: EngineInput): BridgeStep[] {
  const steps: BridgeStep[] = [];
  let run = 0;
  const push = (s: Omit<BridgeStep, "start" | "end">) => {
    if (s.kind === "total" || s.kind === "subtotal") {
      steps.push({ ...s, start: 0, end: s.value });
      run = s.value;
    } else {
      steps.push({ ...s, start: run, end: run + s.value });
      run += s.value;
    }
  };
  const L = rep.lines;
  const refs = (pred: (l: NormalizedLine) => boolean) => [...new Set(L.filter(pred).map((l) => l.record.ref))];
  const ch = rep.channels;
  const snapLabel = rep.snapshot === "monday" ? "Monday" : "Tuesday";

  push({
    id: "raw",
    label: "Raw mixed-metric total",
    short: "Raw total",
    kind: "total",
    value: rep.rawTotal,
    channel: null,
    recordRefs: refs((l) => l.status !== "duplicate" && l.record.transactionType !== "refund" && !(l.record.sourceChannel === "instamart") && !(l.record.transactionType === "sellout_aggregate")),
    rule: "Σ each channel's own report figure for 16–22 Nov, as an analyst would paste it into Excel.",
    explanation:
      "Each channel reports on a different basis: Shopify includes cancelled orders, Blinkit's readily available figure is wholesale sell-in, and Instamart's illustrative report uses delivery date. Adding them produces a number with no single meaning.",
    evidence: "Synthetic — reporting bases are illustrative assumptions, not verified platform behaviour.",
    lineage: CHANNEL_IDS.map((c) => `${CHANNELS[c].short}: ₹${ch[c].raw} — ${ch[c].rawBasis}`),
  });

  const cancelled = L.filter((l) => l.status === "cancelled");
  const cancelValue = sum(cancelled.map((l) => l.record.grossMerchandiseValue - l.record.customerDiscount));
  if (cancelled.length)
    push({
      id: "cancel",
      label: "Exclude Shopify cancellation",
      short: "Cancellations",
      kind: "delta",
      value: -cancelValue,
      channel: "shopify",
      recordRefs: cancelled.map((l) => l.record.ref),
      rule: "order.cancelledAt within reporting week → normalized_sales = 0",
      explanation: "An order cancelled before fulfilment never became a consumer purchase. Shopify's gross sales still include it.",
      evidence: "Synthetic record · cancellation timestamp present in source",
      lineage: cancelled.map((l) => `${l.record.ref} · ${l.record.sourceRecordId} · cancelledAt ${l.record.cancelledAt}`),
    });

  const sellIn = L.filter((l) => l.record.metric === "sell_in" && inWeek(l.record.orderDate, rep.week));
  if (sellIn.length)
    push({
      id: "sellin",
      label: "Remove Blinkit wholesale sell-in",
      short: "Remove sell-in",
      kind: "delta",
      value: -sum(sellIn.map((l) => l.record.grossMerchandiseValue)),
      channel: "blinkit",
      recordRefs: sellIn.map((l) => l.record.ref),
      rule: "metric = sell_in → reported as Wholesale sell-in, never added to consumer sell-out",
      explanation:
        "A wholesale invoice is the brand selling stock to Blinkit — not consumers buying snacks. It is kept as a separate measure so sell-in and sell-out are never double-counted.",
      evidence: "Synthetic invoice: 20 packets × ₹30",
      lineage: sellIn.map((l) => `${l.record.ref} · ${l.record.sourceRecordId} · ${l.record.sourceFile}`),
    });

  const sellOut = L.filter((l) => l.record.transactionType === "sellout_aggregate");
  if (ch.blinkit.status === "comparable")
    push({
      id: "sellout",
      label: "Include Blinkit consumer sell-out",
      short: "Add sell-out",
      kind: "delta",
      value: sum(sellOut.filter((l) => l.status === "included").map((l) => l.normalizedSales)),
      channel: "blinkit",
      recordRefs: sellOut.map((l) => l.record.ref),
      rule: "Blinkit sell-out report rows (date × city × item) → consumer sell-out",
      explanation: "Blinkit's consumer sell-out is the comparable measure. Whether suppliers are entitled to this report is unverified, so it is ingested conditionally.",
      evidence: "Synthetic sell-out report · supplier entitlement unverified",
      lineage: sellOut.map((l) => `${l.record.ref} · ${l.record.city} · ${l.record.sourceFile}`),
    });
  else
    push({
      id: "sellout",
      label: "Blinkit sell-out unavailable — excluded",
      short: "Blinkit excluded",
      kind: "excluded",
      value: 0,
      channel: "blinkit",
      recordRefs: sellOut.map((l) => l.record.ref),
      rule: "Missing source-period → excluded from comparable total and coverage reduced; never imputed as ₹0 sales",
      explanation:
        "Without the sell-out report, Blinkit consumer sales are unknown. The comparable total covers four channels and says so. Sell-in (₹" + ch.blinkit.sellIn + ") is still shown separately.",
      evidence: "Report missing for 16–22 Nov",
      lineage: ["Expected: /commerce/blinkit/sell-out/ for 16–22 Nov", "Received: none"],
    });

  const im = ch.instamart;
  if (im.status === "comparable") {
    const imNorm = im.normalized ?? 0;
    if (imNorm !== im.raw) push({
      id: "orderdate",
      label: "Attribute Instamart order to original Sunday",
      short: "Order-date shift",
      kind: "delta",
      value: imNorm - im.raw,
      channel: "instamart",
      recordRefs: refs((l) => l.record.sourceChannel === "instamart"),
      rule: "recognition_date = order_date (IST). Rows placed Mon 00:00 – Sun 23:59 count in this week regardless of delivery date.",
      explanation:
        "I1 was ordered Sunday 22 Nov at 11:50 PM and delivered Monday. A delivery-date report places it in next week; the comparable metric counts it when the consumer bought it.",
      evidence: "Synthetic · Instamart date basis unverified",
      lineage: L.filter((l) => l.record.sourceChannel === "instamart").map(
        (l) => `${l.record.ref} · ordered ${l.record.orderDate} · delivered ${l.record.deliveryDate} · ${l.record.sourceFile}`,
      ),
    });
  } else {
    push({
      id: "orderdate",
      label: "Instamart non-comparable — excluded",
      short: "Instamart excluded",
      kind: "excluded",
      value: -im.raw,
      channel: "instamart",
      recordRefs: refs((l) => l.record.sourceChannel === "instamart"),
      rule: "Source without order-date → excluded from order-date metric; coverage reduced; not treated as zero",
      explanation:
        "Only a delivery-date report is available. Its ₹" + im.raw + " is not comparable with an order-date metric, so Instamart is excluded and disclosed rather than counted as zero.",
      evidence: "Order-date export not received",
      lineage: ["Received: /commerce/instamart/sales-delivery-date/ (delivery basis)", "Missing: /commerce/instamart/sales-order-date/"],
    });
  }

  const ab = L.filter((l) => l.status === "included" && l.discountAddBack > 0);
  if (ab.length)
    push({
      id: "discount",
      label: "Add back discounts per definition",
      short: "Discount add-back",
      kind: "delta",
      value: sum(ab.map((l) => l.discountAddBack)),
      channel: null,
      recordRefs: ab.map((l) => l.record.ref),
      rule:
        input.definition.discountTreatment === "before_all"
          ? "discount_treatment = before all discounts → normalized += customer_discount"
          : "discount_treatment = before platform-funded discounts → normalized += platform-funded discount",
      explanation: "The selected definition measures value before some customer-facing discounts. This is a definition choice, not a data correction.",
      evidence: "Synthetic · Zepto discount funding is illustrative",
      lineage: ab.map((l) => `${l.record.ref} · ₹${l.record.customerDiscount} ${l.record.discountFundedBy}-funded`),
    });

  const refundLines = L.filter((l) => l.record.transactionType === "refund");
  const preRefund = run;
  if (rep.snapshot === "monday") {
    push({
      id: "final",
      label: rep.week === "W47" ? "Comparable Monday sell-out" : "Comparable sell-out (final)",
      short: rep.week === "W47" ? "Monday sell-out" : "Comparable",
      kind: "total",
      value: rep.comparableTotal,
      channel: null,
      recordRefs: [],
      rule: "Σ normalized_sales over comparable channels",
      explanation: `Consumer purchases across ${rep.comparableChannels.length} of 5 channels, on one definition: merchandise value after customer-facing discounts, before tax and shipping, by original order date (IST).`,
      evidence: `As of ${snapLabel} snapshot`,
      lineage: rep.comparableChannels.map((c) => `${CHANNELS[c].short}: ₹${ch[c].normalized}`),
    });
  } else {
    push({
      id: "monday",
      label: "Comparable sell-out before late adjustments",
      short: "Before refund",
      kind: "subtotal",
      value: preRefund,
      channel: null,
      recordRefs: [],
      rule: "Running total before adjustments received after the Monday cutoff",
      explanation: "Equals the number published in the Monday snapshot.",
      evidence: "Monday snapshot v1",
      lineage: [],
    });
    const restated = refundLines.filter((l) => l.status === "included");
    if (restated.length)
      push({
        id: "refund",
        label: "Restate Tuesday refund to original order week",
        short: "Tuesday refund",
        kind: "delta",
        value: sum(restated.map((l) => l.normalizedSales)),
        channel: "shopify",
        recordRefs: restated.map((l) => l.record.ref),
        rule: "refund_treatment = restated order cohort → refund attributed to the week of the original order",
        explanation: "S2's ₹50 partial refund was issued on Tuesday 24 Nov. Under cohort treatment, last week's sell-out is restated and a revision is issued — the Monday number is never silently overwritten.",
        evidence: "Synthetic refund · ingested Tue 24 Nov 11:40 IST",
        lineage: restated.map((l) => `${l.record.ref} · ${l.record.sourceRecordId} · refund ₹${l.record.refund} on ${l.record.adjustmentDate}`),
      });
    else
      push({
        id: "refund",
        label: "Tuesday refund booked to adjustment week",
        short: "Refund → next week",
        kind: "excluded",
        value: 0,
        channel: "shopify",
        recordRefs: refundLines.map((l) => l.record.ref),
        rule: "refund_treatment = adjustment period → refund counts in the week it occurs (23–29 Nov)",
        explanation: "Under adjustment-period treatment, this week stays unchanged; the ₹50 refund reduces next week's sell-out instead.",
        evidence: "Synthetic refund",
        lineage: refundLines.map((l) => `${l.record.ref} · refund ₹${l.record.refund} on ${l.record.adjustmentDate}`),
      });
    push({
      id: "final",
      label: "Restated weekly sell-out",
      short: "Restated",
      kind: "total",
      value: rep.comparableTotal,
      channel: null,
      recordRefs: [],
      rule: "Σ normalized_sales over comparable channels, as of Tuesday 18:00 IST",
      explanation: "The revised (v2) number for 16–22 Nov. Both versions remain in report history.",
      evidence: "Revision v2",
      lineage: rep.comparableChannels.map((c) => `${CHANNELS[c].short}: ₹${ch[c].normalized}`),
    });
  }

  if (import.meta.env.DEV && Math.abs(run - rep.comparableTotal) > 0.001) {
    console.warn("Bridge does not tie out", run, rep.comparableTotal);
  }
  return steps;
}

/* ------------------------------------------------------------------ */
/* Growth (like-for-like)                                              */
/* ------------------------------------------------------------------ */

export interface Growth {
  available: boolean;
  reason: string | null;
  commonChannels: ChannelId[];
  current: number;
  prior: number;
  abs: number;
  pct: number | null;
  currentPackets: number;
  priorPackets: number;
  contributions: { channel: ChannelId; current: number | null; prior: number | null; delta: number | null }[];
  largest: { channel: ChannelId; delta: number } | null;
}

export function computeGrowth(cur: WeekReport, prior: WeekReport | null): Growth {
  if (!prior)
    return {
      available: false,
      reason: "No prior-week dataset exists in this synthetic workspace, so growth is not shown.",
      commonChannels: [], current: cur.comparableTotal, prior: 0, abs: 0, pct: null,
      currentPackets: cur.packets, priorPackets: 0, contributions: [], largest: null,
    };
  const common = CHANNEL_IDS.filter((c) => cur.channels[c].status === "comparable" && prior.channels[c].status === "comparable");
  const c = sum(common.map((x) => cur.channels[x].normalized ?? 0));
  const p = sum(common.map((x) => prior.channels[x].normalized ?? 0));
  const contributions = CHANNEL_IDS.map((ch) =>
    common.includes(ch)
      ? { channel: ch, current: cur.channels[ch].normalized, prior: prior.channels[ch].normalized, delta: (cur.channels[ch].normalized ?? 0) - (prior.channels[ch].normalized ?? 0) }
      : { channel: ch, current: cur.channels[ch].normalized, prior: prior.channels[ch].normalized, delta: null },
  );
  const ranked = contributions.filter((x) => x.delta !== null).sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0));
  return {
    available: true,
    reason: common.length < 5 ? `Like-for-like on ${common.length} of 5 channels comparable in both weeks.` : null,
    commonChannels: common,
    current: c,
    prior: p,
    abs: c - p,
    pct: p ? (c - p) / p : null,
    currentPackets: sum(common.map((x) => cur.channels[x].packets ?? 0)),
    priorPackets: sum(common.map((x) => prior.channels[x].packets ?? 0)),
    contributions,
    largest: ranked.length ? { channel: ranked[0].channel, delta: ranked[0].delta! } : null,
  };
}
