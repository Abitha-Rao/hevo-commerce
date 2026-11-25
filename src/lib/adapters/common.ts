import type { CanonicalSalesRecord, ChannelId, WeekId } from "@/data/types";

export interface SourceAdapter {
  channel: ChannelId;
  /** Map every raw row for the week into canonical sales records. */
  toCanonical: (week: WeekId) => CanonicalSalesRecord[];
  /** The figure the channel's own report would show for the week, before any normalization. */
  rawReportValue: (week: WeekId) => number;
  rawReportBasis: string;
}

export const WEEKS: Record<WeekId, { id: WeekId; label: string; short: string; start: string; end: string }> = {
  W47: { id: "W47", label: "16–22 Nov 2026", short: "Week 47", start: "2026-11-16T00:00:00+05:30", end: "2026-11-23T00:00:00+05:30" },
  W46: { id: "W46", label: "9–15 Nov 2026", short: "Week 46", start: "2026-11-09T00:00:00+05:30", end: "2026-11-16T00:00:00+05:30" },
};

export const PRIOR_WEEK: Record<WeekId, WeekId | null> = { W47: "W46", W46: null };

/** Monday–Sunday window in IST, end exclusive. */
export function inWeek(iso: string | null, week: WeekId): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= new Date(WEEKS[week].start).getTime() && t < new Date(WEEKS[week].end).getTime();
}

export const base: Omit<
  CanonicalSalesRecord,
  | "ref" | "week" | "sourceChannel" | "sourceRecordId" | "transactionType" | "commercialModel" | "metric"
  | "sourceSku" | "sellingUnits" | "grossMerchandiseValue" | "reportBasis" | "sourceFile" | "ingestedAt"
> = {
  orderDate: null,
  deliveryDate: null,
  adjustmentDate: null,
  cancelledAt: null,
  customerDiscount: 0,
  discountFundedBy: null,
  tax: 0,
  refund: 0,
  parentRef: null,
  refundUnits: 0,
  city: null,
  state: null,
  geoGranularity: "unknown",
  duplicateOf: null,
  gatedBy: null,
};
