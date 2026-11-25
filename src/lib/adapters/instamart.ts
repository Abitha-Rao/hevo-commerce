import { INSTAMART_ROWS } from "@/data/rawSources";
import { base, inWeek, type SourceAdapter } from "./common";

export const instamartAdapter: SourceAdapter = {
  channel: "instamart",
  toCanonical: (week) =>
    INSTAMART_ROWS.filter((r) => r.week === week).map((r) => ({
      ...base,
      ref: r.ref,
      week: r.week,
      sourceChannel: "instamart" as const,
      sourceRecordId: `${r.order_id}:${r.sku}`,
      transactionType: "order_line" as const,
      commercialModel: "quick_commerce_marketplace" as const,
      metric: "sell_out" as const,
      orderDate: r.ordered_at,
      deliveryDate: r.delivered_at,
      sourceSku: r.sku,
      sellingUnits: r.qty,
      grossMerchandiseValue: r.gmv,
      geoGranularity: "unknown" as const,
      reportBasis: "order_date" as const,
      sourceFile: r._file,
      ingestedAt: r._ingestedAt,
      gatedBy: "instamart_order_date" as const,
    })),
  /** Illustrative raw report is delivery-date based: rows delivered within the week. */
  rawReportValue: (week) => INSTAMART_ROWS.filter((r) => inWeek(r.delivered_at, week)).reduce((s, r) => s + r.gmv, 0),
  rawReportBasis: "Sales by delivery date",
};
