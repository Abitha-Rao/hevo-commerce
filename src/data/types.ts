/**
 * Canonical sales schema for Hevo Commerce.
 * Every source adapter emits CanonicalSalesRecord rows; every number in the UI is
 * derived from these rows by the normalization + reporting engine.
 */

export type ChannelId = "shopify" | "amazon" | "blinkit" | "zepto" | "instamart";
export const CHANNEL_IDS: ChannelId[] = ["shopify", "amazon", "blinkit", "zepto", "instamart"];

export type WeekId = "W47" | "W46";

export type TransactionType =
  | "order_line"
  | "refund"
  | "wholesale_invoice"
  | "sellout_aggregate";

export type CommercialModel =
  | "d2c_storefront"
  | "marketplace"
  | "inventory_led"
  | "quick_commerce_marketplace";

export type GeoGranularity = "city" | "state" | "unknown";

/** The date basis a source report uses to place a row in a period. */
export type ReportBasis = "order_date" | "delivery_date" | "invoice_date" | "sellout_date";

export interface CanonicalSalesRecord {
  /** Short reference used in the prototype narrative (S1, A2, B1 …). */
  ref: string;
  week: WeekId;
  sourceChannel: ChannelId;
  sourceRecordId: string;
  transactionType: TransactionType;
  commercialModel: CommercialModel;
  /** sell_out = consumer purchase; sell_in = brand → platform wholesale. */
  metric: "sell_out" | "sell_in";
  orderDate: string | null;
  deliveryDate: string | null;
  adjustmentDate: string | null;
  cancelledAt: string | null;
  sourceSku: string;
  sellingUnits: number;
  grossMerchandiseValue: number;
  customerDiscount: number;
  discountFundedBy: "brand" | "platform" | null;
  tax: number;
  refund: number;
  /** For refund rows: the order line the refund belongs to. */
  parentRef: string | null;
  refundUnits: number;
  city: string | null;
  state: string | null;
  geoGranularity: GeoGranularity;
  reportBasis: ReportBasis;
  sourceFile: string;
  ingestedAt: string;
  /** Deterministic duplicate detection sets this when the same source record appears twice. */
  duplicateOf: string | null;
  /** Which availability flag gates this row (scenario controls). */
  gatedBy: "blinkit_sellout" | "instamart_order_date" | null;
}

export interface CanonicalProduct {
  id: string;
  name: string;
  packSize: string;
}

export interface SkuMapping {
  channel: ChannelId;
  sourceSku: string;
  sourceName: string;
  canonicalProductId: string | null;
  packetMultiplier: number | null;
}

/* ---------------- Sales definition ---------------- */

export type ReportingPeriod = "mon_sun_ist" | "sun_sat_ist" | "calendar_month";
export type RecognitionDate = "order_date" | "delivery_date" | "settlement_date";
export type RefundTreatment = "restate_cohort" | "adjustment_period";
export type DiscountTreatment = "after_all" | "before_platform" | "before_all";

export interface SalesDefinition {
  reportingPeriod: ReportingPeriod;
  recognitionDate: RecognitionDate;
  refundTreatment: RefundTreatment;
  discountTreatment: DiscountTreatment;
}

export const DEFAULT_DEFINITION: SalesDefinition = {
  reportingPeriod: "mon_sun_ist",
  recognitionDate: "order_date",
  refundTreatment: "restate_cohort",
  discountTreatment: "after_all",
};

/* ---------------- Scenario ---------------- */

export type Snapshot = "monday" | "tuesday";

export interface Scenario {
  snapshot: Snapshot;
  blinkitSellOut: boolean;
  instamartOrderDate: boolean;
}

export const DEFAULT_SCENARIO: Scenario = {
  snapshot: "monday",
  blinkitSellOut: true,
  instamartOrderDate: true,
};
