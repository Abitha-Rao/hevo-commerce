/**
 * SYNTHETIC raw source payloads, shaped loosely like each platform's export.
 * Field names are illustrative and are NOT verified platform schemas.
 *
 * Week W47 (16–22 Nov 2026) reproduces the exact take-home reconciliation scenario.
 * Week W46 (9–15 Nov 2026) is a separate, clearly labelled synthetic prior week used
 * only to compute week-on-week growth.
 *
 * All amounts exclude tax and shipping.
 */
import type { WeekId } from "./types";

/* ---------------- Shopify (existing Hevo connector, GraphQL Admin API) ---------------- */
export interface ShopifyOrder {
  ref: string;
  week: WeekId;
  id: string;
  createdAt: string;
  cancelledAt: string | null;
  shippingAddress: { city: string | null; province: string | null };
  lineItems: { sku: string; quantity: number; originalTotal: number; discount: number }[];
  refunds: { id: string; createdAt: string; amount: number; quantity: number; ingestedAt: string }[];
  ingestedAt: string;
}

/* ---------------- Amazon (existing Hevo Selling Partner connector) ---------------- */
export interface AmazonOrderRow {
  ref: string;
  week: WeekId;
  "amazon-order-id": string;
  "purchase-date": string;
  "order-status": "Shipped" | "Cancelled";
  sku: string;
  quantity: number;
  "item-price": number;
  "item-promotion-discount": number;
  "promotion-funded-by": "brand" | null;
  "ship-city": string | null;
  "ship-state": string | null;
  _file: string;
  _ingestedAt: string;
}

/* ---------------- Blinkit (portal report ingestion) ---------------- */
export interface BlinkitInvoiceRow {
  ref: string;
  week: WeekId;
  invoice_no: string;
  invoice_date: string;
  item_id: string;
  qty: number;
  rate: number;
  _file: string;
  _ingestedAt: string;
}
export interface BlinkitSellOutRow {
  ref: string;
  week: WeekId;
  date: string;
  item_id: string;
  city: string;
  state: string;
  qty_sold: number;
  gmv: number;
  _file: string;
  _ingestedAt: string;
}

/* ---------------- Zepto (portal report ingestion, subject to export availability) ---------------- */
export interface ZeptoRow {
  ref: string;
  week: WeekId;
  order_id: string;
  order_date: string;
  sku_code: string;
  units: number;
  gross_value: number;
  discount_value: number;
  discount_funded_by: "platform" | null;
  _file: string;
  _ingestedAt: string;
}

/* ---------------- Swiggy Instamart (conditional file ingestion) ---------------- */
export interface InstamartRow {
  ref: string;
  week: WeekId;
  order_id: string;
  ordered_at: string | null;
  delivered_at: string;
  sku: string;
  qty: number;
  gmv: number;
  basis: "order_date" | "delivery_date";
  _file: string;
  _ingestedAt: string;
}

const MON_INGEST = "2026-11-23T06:00:00+05:30";
const PRIOR_INGEST = "2026-11-16T06:00:00+05:30";

export const SHOPIFY_ORDERS: ShopifyOrder[] = [
  {
    ref: "S1", week: "W47", id: "gid://shopify/Order/58010001", createdAt: "2026-11-17T10:12:00+05:30", cancelledAt: null,
    shippingAddress: { city: "Bengaluru", province: "Karnataka" },
    lineItems: [{ sku: "MASALA-SINGLE", quantity: 2, originalTotal: 100, discount: 0 }],
    refunds: [], ingestedAt: MON_INGEST,
  },
  {
    ref: "S2", week: "W47", id: "gid://shopify/Order/58010002", createdAt: "2026-11-18T19:40:00+05:30", cancelledAt: null,
    shippingAddress: { city: "Mumbai", province: "Maharashtra" },
    lineItems: [{ sku: "MASALA-SINGLE", quantity: 4, originalTotal: 200, discount: 0 }],
    refunds: [{ id: "gid://shopify/Refund/9001", createdAt: "2026-11-24T11:20:00+05:30", amount: 50, quantity: 1, ingestedAt: "2026-11-24T11:40:00+05:30" }],
    ingestedAt: MON_INGEST,
  },
  {
    ref: "S3", week: "W47", id: "gid://shopify/Order/58010003", createdAt: "2026-11-19T14:05:00+05:30", cancelledAt: "2026-11-19T16:30:00+05:30",
    shippingAddress: { city: "Bengaluru", province: "Karnataka" },
    lineItems: [{ sku: "MASALA-SINGLE", quantity: 2, originalTotal: 100, discount: 0 }],
    refunds: [], ingestedAt: MON_INGEST,
  },
  // Prior week (synthetic, for growth only)
  {
    ref: "PS1", week: "W46", id: "gid://shopify/Order/57990011", createdAt: "2026-11-10T09:30:00+05:30", cancelledAt: null,
    shippingAddress: { city: "Bengaluru", province: "Karnataka" },
    lineItems: [{ sku: "MASALA-SINGLE", quantity: 2, originalTotal: 100, discount: 0 }],
    refunds: [], ingestedAt: PRIOR_INGEST,
  },
  {
    ref: "PS2", week: "W46", id: "gid://shopify/Order/57990012", createdAt: "2026-11-13T20:10:00+05:30", cancelledAt: null,
    shippingAddress: { city: "Mumbai", province: "Maharashtra" },
    lineItems: [{ sku: "MASALA-SINGLE", quantity: 3, originalTotal: 150, discount: 0 }],
    refunds: [], ingestedAt: PRIOR_INGEST,
  },
];

export const AMAZON_ORDERS: AmazonOrderRow[] = [
  {
    ref: "A1", week: "W47", "amazon-order-id": "408-1234567-0000001", "purchase-date": "2026-11-16T21:15:00+05:30", "order-status": "Shipped",
    sku: "MC-01", quantity: 4, "item-price": 200, "item-promotion-discount": 20, "promotion-funded-by": "brand",
    "ship-city": "Bengaluru", "ship-state": "Karnataka", _file: "amazon_orders_2026-11-16_22.tsv", _ingestedAt: MON_INGEST,
  },
  {
    ref: "A2", week: "W47", "amazon-order-id": "408-1234567-0000002", "purchase-date": "2026-11-21T12:30:00+05:30", "order-status": "Shipped",
    sku: "MC-01", quantity: 2, "item-price": 100, "item-promotion-discount": 0, "promotion-funded-by": null,
    "ship-city": null, "ship-state": "Maharashtra", _file: "amazon_orders_2026-11-16_22.tsv", _ingestedAt: MON_INGEST,
  },
  // Same order re-appearing in an overlapping re-download (deterministic duplicate)
  {
    ref: "A2", week: "W47", "amazon-order-id": "408-1234567-0000002", "purchase-date": "2026-11-21T12:30:00+05:30", "order-status": "Shipped",
    sku: "MC-01", quantity: 2, "item-price": 100, "item-promotion-discount": 0, "promotion-funded-by": null,
    "ship-city": null, "ship-state": "Maharashtra", _file: "amazon_orders_2026-11-20_22_redownload.tsv", _ingestedAt: "2026-11-24T10:05:00+05:30",
  },
  {
    ref: "PA1", week: "W46", "amazon-order-id": "408-1234567-0000091", "purchase-date": "2026-11-11T18:00:00+05:30", "order-status": "Shipped",
    sku: "MC-01", quantity: 3, "item-price": 150, "item-promotion-discount": 0, "promotion-funded-by": null,
    "ship-city": "Bengaluru", "ship-state": "Karnataka", _file: "amazon_orders_2026-11-09_15.tsv", _ingestedAt: PRIOR_INGEST,
  },
  {
    ref: "PA2", week: "W46", "amazon-order-id": "408-1234567-0000092", "purchase-date": "2026-11-14T11:45:00+05:30", "order-status": "Shipped",
    sku: "MC-01", quantity: 1, "item-price": 50, "item-promotion-discount": 0, "promotion-funded-by": null,
    "ship-city": null, "ship-state": "Maharashtra", _file: "amazon_orders_2026-11-09_15.tsv", _ingestedAt: PRIOR_INGEST,
  },
];

export const BLINKIT_INVOICES: BlinkitInvoiceRow[] = [
  { ref: "BINV", week: "W47", invoice_no: "BLK-INV-77120", invoice_date: "2026-11-19T00:00:00+05:30", item_id: "BLK-100482", qty: 20, rate: 30, _file: "blinkit/sell-in-invoices/BLK_INV_2026-11-19.csv", _ingestedAt: MON_INGEST },
  { ref: "PBINV", week: "W46", invoice_no: "BLK-INV-76840", invoice_date: "2026-11-12T00:00:00+05:30", item_id: "BLK-100482", qty: 10, rate: 30, _file: "blinkit/sell-in-invoices/BLK_INV_2026-11-12.csv", _ingestedAt: PRIOR_INGEST },
];

export const BLINKIT_SELLOUT: BlinkitSellOutRow[] = [
  { ref: "B1", week: "W47", date: "2026-11-20T00:00:00+05:30", item_id: "BLK-100482", city: "Bengaluru", state: "Karnataka", qty_sold: 4, gmv: 200, _file: "blinkit/sell-out/blinkit_sellout_2026-11-16_22.csv", _ingestedAt: MON_INGEST },
  { ref: "B2", week: "W47", date: "2026-11-21T00:00:00+05:30", item_id: "BLK-100482", city: "Delhi", state: "Delhi", qty_sold: 2, gmv: 100, _file: "blinkit/sell-out/blinkit_sellout_2026-11-16_22.csv", _ingestedAt: MON_INGEST },
  { ref: "PB1", week: "W46", date: "2026-11-13T00:00:00+05:30", item_id: "BLK-100482", city: "Bengaluru", state: "Karnataka", qty_sold: 3, gmv: 150, _file: "blinkit/sell-out/blinkit_sellout_2026-11-09_15.csv", _ingestedAt: PRIOR_INGEST },
];

export const ZEPTO_ROWS: ZeptoRow[] = [
  { ref: "Z1", week: "W47", order_id: "ZP-88120031", order_date: "2026-11-18T20:00:00+05:30", sku_code: "MC-PACK6", units: 1, gross_value: 300, discount_value: 30, discount_funded_by: "platform", _file: "zepto/supplier-transactions/zepto_sales_2026-11-16_22.csv", _ingestedAt: MON_INGEST },
  { ref: "Z2", week: "W47", order_id: "ZP-88120032", order_date: "2026-11-20T18:45:00+05:30", sku_code: "MC-SINGLE", units: 2, gross_value: 100, discount_value: 0, discount_funded_by: null, _file: "zepto/supplier-transactions/zepto_sales_2026-11-16_22.csv", _ingestedAt: MON_INGEST },
  { ref: "PZ1", week: "W46", order_id: "ZP-88010077", order_date: "2026-11-12T19:20:00+05:30", sku_code: "MC-SINGLE", units: 4, gross_value: 200, discount_value: 0, discount_funded_by: null, _file: "zepto/supplier-transactions/zepto_sales_2026-11-09_15.csv", _ingestedAt: PRIOR_INGEST },
];

export const INSTAMART_ROWS: InstamartRow[] = [
  // Only present in the order-date export; absent from the delivery-date export for 16–22 Nov.
  { ref: "I1", week: "W47", order_id: "IM-4471920", ordered_at: "2026-11-22T23:50:00+05:30", delivered_at: "2026-11-23T00:25:00+05:30", sku: "IM-559102", qty: 4, gmv: 200, basis: "order_date", _file: "instamart/sales-order-date/instamart_orders_2026-11-16_22.csv", _ingestedAt: MON_INGEST },
  { ref: "PI1", week: "W46", order_id: "IM-4460311", ordered_at: "2026-11-11T13:00:00+05:30", delivered_at: "2026-11-11T13:22:00+05:30", sku: "IM-559102", qty: 3, gmv: 150, basis: "order_date", _file: "instamart/sales-order-date/instamart_orders_2026-11-09_15.csv", _ingestedAt: PRIOR_INGEST },
];

