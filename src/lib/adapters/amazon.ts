import type { WeekId } from "@/data/types";
import { AMAZON_ORDERS } from "@/data/rawSources";
import { base, inWeek, type SourceAdapter } from "./common";

const PRIMARY_FILE = (week: WeekId) =>
  week === "W47" ? "amazon_orders_2026-11-16_22.tsv" : "amazon_orders_2026-11-09_15.tsv";

export const amazonAdapter: SourceAdapter = {
  channel: "amazon",
  toCanonical: (week) =>
    AMAZON_ORDERS.filter((r) => r.week === week).map((r) => ({
      ...base,
      ref: r.ref,
      week: r.week,
      sourceChannel: "amazon" as const,
      sourceRecordId: `${r["amazon-order-id"]}:${r.sku}`,
      transactionType: "order_line" as const,
      commercialModel: "marketplace" as const,
      metric: "sell_out" as const,
      orderDate: r["purchase-date"],
      cancelledAt: r["order-status"] === "Cancelled" ? r["purchase-date"] : null,
      sourceSku: r.sku,
      sellingUnits: r.quantity,
      grossMerchandiseValue: r["item-price"],
      customerDiscount: r["item-promotion-discount"],
      discountFundedBy: r["promotion-funded-by"],
      city: r["ship-city"],
      state: r["ship-state"],
      geoGranularity: r["ship-city"] ? ("city" as const) : r["ship-state"] ? ("state" as const) : ("unknown" as const),
      reportBasis: "order_date" as const,
      sourceFile: r._file,
      ingestedAt: r._ingestedAt,
    })),
  /** Item price net of promotions, from the primary weekly orders report. */
  rawReportValue: (week) =>
    AMAZON_ORDERS.filter((r) => r._file === PRIMARY_FILE(week) && inWeek(r["purchase-date"], week)).reduce(
      (s, r) => s + r["item-price"] - r["item-promotion-discount"],
      0,
    ),
  rawReportBasis: "Item price net of promotions, by purchase date",
};
