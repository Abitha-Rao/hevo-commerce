import type { CanonicalSalesRecord, WeekId } from "@/data/types";
import { SHOPIFY_ORDERS, type ShopifyOrder } from "@/data/rawSources";
import { base, inWeek, type SourceAdapter } from "./common";

function toCanonical(o: ShopifyOrder): CanonicalSalesRecord[] {
  const out: CanonicalSalesRecord[] = [];
  o.lineItems.forEach((li, i) => {
    out.push({
      ...base,
      ref: o.ref,
      week: o.week,
      sourceChannel: "shopify",
      sourceRecordId: `${o.id}#L${i + 1}`,
      transactionType: "order_line",
      commercialModel: "d2c_storefront",
      metric: "sell_out",
      orderDate: o.createdAt,
      cancelledAt: o.cancelledAt,
      sourceSku: li.sku,
      sellingUnits: li.quantity,
      grossMerchandiseValue: li.originalTotal,
      customerDiscount: li.discount,
      discountFundedBy: li.discount ? "brand" : null,
      city: o.shippingAddress.city,
      state: o.shippingAddress.province,
      geoGranularity: o.shippingAddress.city ? "city" : o.shippingAddress.province ? "state" : "unknown",
      reportBasis: "order_date",
      sourceFile: "Hevo Shopify connector · orders",
      ingestedAt: o.ingestedAt,
    });
    for (const r of o.refunds) {
      out.push({
        ...base,
        ref: `${o.ref}-R`,
        week: o.week,
        sourceChannel: "shopify",
        sourceRecordId: r.id,
        transactionType: "refund",
        commercialModel: "d2c_storefront",
        metric: "sell_out",
        orderDate: o.createdAt,
        adjustmentDate: r.createdAt,
        sourceSku: li.sku,
        sellingUnits: 0,
        grossMerchandiseValue: 0,
        refund: r.amount,
        refundUnits: r.quantity,
        parentRef: o.ref,
        city: o.shippingAddress.city,
        state: o.shippingAddress.province,
        geoGranularity: o.shippingAddress.city ? "city" : "state",
        reportBasis: "order_date",
        sourceFile: "Hevo Shopify connector · refunds",
        ingestedAt: r.ingestedAt,
      });
    }
  });
  return out;
}

export const shopifyAdapter: SourceAdapter = {
  channel: "shopify",
  toCanonical: (week: WeekId) => SHOPIFY_ORDERS.filter((o) => o.week === week).flatMap(toCanonical),
  /** Shopify's illustrative native "gross sales": all orders created in the week, including cancelled. */
  rawReportValue: (week: WeekId) =>
    SHOPIFY_ORDERS.filter((o) => inWeek(o.createdAt, week)).reduce(
      (s, o) => s + o.lineItems.reduce((t, li) => t + li.originalTotal - li.discount, 0),
      0,
    ),
  rawReportBasis: "Gross sales by order date (includes cancelled orders)",
};
