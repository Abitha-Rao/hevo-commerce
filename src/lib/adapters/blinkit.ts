import { BLINKIT_INVOICES, BLINKIT_SELLOUT } from "@/data/rawSources";
import { base, inWeek, type SourceAdapter } from "./common";

export const blinkitAdapter: SourceAdapter = {
  channel: "blinkit",
  toCanonical: (week) => [
    ...BLINKIT_INVOICES.filter((r) => r.week === week).map((r) => ({
      ...base,
      ref: r.ref,
      week: r.week,
      sourceChannel: "blinkit" as const,
      sourceRecordId: `${r.invoice_no}:${r.item_id}`,
      transactionType: "wholesale_invoice" as const,
      commercialModel: "inventory_led" as const,
      metric: "sell_in" as const,
      orderDate: r.invoice_date,
      sourceSku: r.item_id,
      sellingUnits: r.qty,
      grossMerchandiseValue: r.qty * r.rate,
      reportBasis: "invoice_date" as const,
      sourceFile: r._file,
      ingestedAt: r._ingestedAt,
    })),
    ...BLINKIT_SELLOUT.filter((r) => r.week === week).map((r) => ({
      ...base,
      ref: r.ref,
      week: r.week,
      sourceChannel: "blinkit" as const,
      sourceRecordId: `SO:${r.date.slice(0, 10)}:${r.city}:${r.item_id}`,
      transactionType: "sellout_aggregate" as const,
      commercialModel: "inventory_led" as const,
      metric: "sell_out" as const,
      orderDate: r.date,
      sourceSku: r.item_id,
      sellingUnits: r.qty_sold,
      grossMerchandiseValue: r.gmv,
      city: r.city,
      state: r.state,
      geoGranularity: "city" as const,
      reportBasis: "sellout_date" as const,
      sourceFile: r._file,
      ingestedAt: r._ingestedAt,
      gatedBy: "blinkit_sellout" as const,
    })),
  ],
  /** Illustrative: the figure most readily available from Blinkit is wholesale sell-in. */
  rawReportValue: (week) =>
    BLINKIT_INVOICES.filter((r) => inWeek(r.invoice_date, week)).reduce((s, r) => s + r.qty * r.rate, 0),
  rawReportBasis: "Wholesale sell-in by invoice date",
};
