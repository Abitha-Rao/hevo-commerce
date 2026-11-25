import { ZEPTO_ROWS } from "@/data/rawSources";
import { base, inWeek, type SourceAdapter } from "./common";

export const zeptoAdapter: SourceAdapter = {
  channel: "zepto",
  toCanonical: (week) =>
    ZEPTO_ROWS.filter((r) => r.week === week).map((r) => ({
      ...base,
      ref: r.ref,
      week: r.week,
      sourceChannel: "zepto" as const,
      sourceRecordId: `${r.order_id}:${r.sku_code}`,
      transactionType: "order_line" as const,
      commercialModel: "quick_commerce_marketplace" as const,
      metric: "sell_out" as const,
      orderDate: r.order_date,
      sourceSku: r.sku_code,
      sellingUnits: r.units,
      grossMerchandiseValue: r.gross_value,
      customerDiscount: r.discount_value,
      discountFundedBy: r.discount_funded_by,
      geoGranularity: "unknown" as const,
      reportBasis: "order_date" as const,
      sourceFile: r._file,
      ingestedAt: r._ingestedAt,
    })),
  rawReportValue: (week) =>
    ZEPTO_ROWS.filter((r) => inWeek(r.order_date, week)).reduce((s, r) => s + r.gross_value - r.discount_value, 0),
  rawReportBasis: "Value after discounts by order date",
};
