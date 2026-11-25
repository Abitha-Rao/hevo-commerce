/** Synthetic demo files that reviewers can "upload" without providing their own data. */
import { BLINKIT_INVOICES, BLINKIT_SELLOUT, INSTAMART_ROWS, ZEPTO_ROWS } from "@/data/rawSources";

const d = (iso: string) => iso.slice(0, 10);

export const DEMO_FILES: Record<string, { name: string; content: string }> = {
  "blinkit-sellin": {
    name: "BLK_INV_2026-11-19.csv",
    content: ["invoice_no,invoice_date,item_id,qty,rate", ...BLINKIT_INVOICES.filter((r) => r.week === "W47").map((r) => `${r.invoice_no},${d(r.invoice_date)},${r.item_id},${r.qty},${r.rate}`)].join("\n"),
  },
  "blinkit-sellout": {
    name: "blinkit_sellout_2026-11-16_22.csv",
    content: ["date,item_id,city,qty_sold,gmv", ...BLINKIT_SELLOUT.filter((r) => r.week === "W47").map((r) => `${d(r.date)},${r.item_id},${r.city},${r.qty_sold},${r.gmv}`)].join("\n"),
  },
  "zepto-txn": {
    name: "zepto_sales_2026-11-16_22.csv",
    content: ["order_id,order_date,sku_code,units,gross_value,discount_value", ...ZEPTO_ROWS.filter((r) => r.week === "W47").map((r) => `${r.order_id},${d(r.order_date)},${r.sku_code},${r.units},${r.gross_value},${r.discount_value}`)].join("\n"),
  },
  "zepto-analytics": { name: "zepto_atom_city_2026-11-16_22.csv", content: "date,city,sku_code,units,gmv" },
  "instamart-delivery": {
    name: "instamart_delivery_2026-11-16_22.csv",
    content: "order_id,delivered_at,sku,qty,gmv",
  },
  "instamart-orderdate": {
    name: "instamart_orders_2026-11-16_22.csv",
    content: ["order_id,ordered_at,delivered_at,sku,qty,gmv", ...INSTAMART_ROWS.filter((r) => r.week === "W47").map((r) => `${r.order_id},${r.ordered_at},${r.delivered_at},${r.sku},${r.qty},${r.gmv}`)].join("\n"),
  },
  "instamart-returns": { name: "instamart_returns_2026-11-16_22.csv", content: "order_id,return_date,sku,qty,refund_value" },
};
