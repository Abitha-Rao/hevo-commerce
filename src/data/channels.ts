import type { ChannelId, CommercialModel, GeoGranularity } from "./types";

export type Evidence = "established" | "documented" | "unverified" | "conditional";

export interface Capability {
  label: string;
  evidence: Evidence;
  note?: string;
}

export interface FolderSpec {
  id: string;
  path: string;
  reportType: string;
  expectedColumns: string[];
  /** Which piece of workspace state tells us whether this folder has a file for the week. */
  availability: "always" | "blinkit_sellout" | "instamart_order_date" | "instamart_returns" | "never";
  unavailableReason?: string;
}

export interface ChannelMeta {
  id: ChannelId;
  name: string;
  short: string;
  color: string;
  kind: "connector" | "files";
  method: string;
  methodDetail: string;
  commercialModel: CommercialModel;
  commercialModelLabel: string;
  granularity: string;
  geo: GeoGranularity | "mixed";
  capabilities: Capability[];
  folders: FolderSpec[];
  lastSync: string;
}

export const CHANNELS: Record<ChannelId, ChannelMeta> = {
  shopify: {
    id: "shopify",
    name: "Shopify",
    short: "Shopify",
    color: "#4f46e5",
    kind: "connector",
    method: "Existing Hevo connector",
    methodDetail: "GraphQL Admin API",
    commercialModel: "d2c_storefront",
    commercialModelLabel: "Direct-to-consumer storefront",
    granularity: "Order line · timestamp · SKU · city",
    geo: "city",
    lastSync: "2026-11-24T18:00:00+05:30",
    capabilities: [
      { label: "Order and line-item data", evidence: "established" },
      { label: "SKU, discounts, refunds and cancellations", evidence: "established" },
      { label: "Shipping city and state", evidence: "established" },
    ],
    folders: [],
  },
  amazon: {
    id: "amazon",
    name: "Amazon India",
    short: "Amazon",
    color: "#0ea5e9",
    kind: "connector",
    method: "Existing Hevo connector",
    methodDetail: "Amazon Selling Partner API",
    commercialModel: "marketplace",
    commercialModelLabel: "Marketplace (seller of record: brand)",
    granularity: "Order line · timestamp · SKU · city where provided",
    geo: "mixed",
    lastSync: "2026-11-24T18:00:00+05:30",
    capabilities: [
      { label: "Orders and order reports", evidence: "established" },
      { label: "Financial events (refunds, fees)", evidence: "established" },
      { label: "Ship-city on every order", evidence: "conditional", note: "Some rows carry state only; city is never inferred." },
    ],
    folders: [],
  },
  blinkit: {
    id: "blinkit",
    name: "Blinkit",
    short: "Blinkit",
    color: "#f59e0b",
    kind: "files",
    method: "Portal report ingestion",
    methodDetail: "Analyst drops portal exports into dedicated folders",
    commercialModel: "inventory_led",
    commercialModelLabel: "Predominantly inventory-led",
    granularity: "Sell-in: invoice line · Sell-out: day × city × item",
    geo: "city",
    lastSync: "2026-11-23T06:00:00+05:30",
    capabilities: [
      { label: "Wholesale sell-in (purchase orders / invoices)", evidence: "documented" },
      { label: "Conditional consumer sell-out report", evidence: "conditional" },
      { label: "Supplier entitlement to sell-out data", evidence: "unverified", note: "Not confirmed for this brand." },
    ],
    folders: [
      { id: "blinkit-sellin", path: "/commerce/blinkit/sell-in-invoices", reportType: "Wholesale invoices (sell-in)", expectedColumns: ["invoice_no", "invoice_date", "item_id", "qty", "rate"], availability: "always" },
      { id: "blinkit-sellout", path: "/commerce/blinkit/sell-out", reportType: "Consumer sell-out", expectedColumns: ["date", "item_id", "city", "qty_sold", "gmv"], availability: "blinkit_sellout" },
    ],
  },
  zepto: {
    id: "zepto",
    name: "Zepto",
    short: "Zepto",
    color: "#a855f7",
    kind: "files",
    method: "Portal report ingestion",
    methodDetail: "Subject to export availability",
    commercialModel: "quick_commerce_marketplace",
    commercialModelLabel: "Quick-commerce (model varies by brand agreement)",
    granularity: "Order · day · SKU · no city in download",
    geo: "unknown",
    lastSync: "2026-11-23T06:00:00+05:30",
    capabilities: [
      { label: "Supplier transactions export", evidence: "conditional" },
      { label: "Consumer analytics", evidence: "documented", note: "City analytics documented through paid Atom." },
      { label: "Downloadable sales granularity", evidence: "unverified" },
    ],
    folders: [
      { id: "zepto-txn", path: "/commerce/zepto/supplier-transactions", reportType: "Supplier transactions", expectedColumns: ["order_id", "order_date", "sku_code", "units", "gross_value", "discount_value"], availability: "always" },
      { id: "zepto-analytics", path: "/commerce/zepto/consumer-analytics", reportType: "City analytics (Atom)", expectedColumns: ["date", "city", "sku_code", "units", "gmv"], availability: "never", unavailableReason: "Paid Atom subscription not active for this workspace" },
    ],
  },
  instamart: {
    id: "instamart",
    name: "Swiggy Instamart",
    short: "Instamart",
    color: "#ec4899",
    kind: "files",
    method: "Conditional file ingestion",
    methodDetail: "Brand onboarding confirmed",
    commercialModel: "quick_commerce_marketplace",
    commercialModelLabel: "Quick-commerce (model to be confirmed)",
    granularity: "Illustrative: delivery-date order lines",
    geo: "unknown",
    lastSync: "2026-11-23T06:00:00+05:30",
    capabilities: [
      { label: "Brand onboarding", evidence: "established" },
      { label: "Actual report schema", evidence: "unverified" },
      { label: "Sales granularity and date basis", evidence: "unverified" },
    ],
    folders: [
      { id: "instamart-delivery", path: "/commerce/instamart/sales-delivery-date", reportType: "Sales (delivery date)", expectedColumns: ["order_id", "delivered_at", "sku", "qty", "gmv"], availability: "always" },
      { id: "instamart-orderdate", path: "/commerce/instamart/sales-order-date", reportType: "Sales (order date)", expectedColumns: ["order_id", "ordered_at", "delivered_at", "sku", "qty", "gmv"], availability: "instamart_order_date" },
      { id: "instamart-returns", path: "/commerce/instamart/returns", reportType: "Returns", expectedColumns: ["order_id", "return_date", "sku", "qty", "refund_value"], availability: "instamart_returns" },
    ],
  },
};

export const EVIDENCE_LABEL: Record<Evidence, string> = {
  established: "Existing capability",
  documented: "Publicly documented",
  conditional: "Conditional",
  unverified: "Unverified",
};
