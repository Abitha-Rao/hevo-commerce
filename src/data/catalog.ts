import type { CanonicalProduct, SkuMapping } from "./types";

/** Synthetic canonical product catalogue for the demo brand, Crunch & Co. */
export const PRODUCTS: CanonicalProduct[] = [
  { id: "CC-MSL-40G", name: "Masala Chips", packSize: "40 g packet" },
  { id: "CC-SLT-40G", name: "Classic Salted Chips", packSize: "40 g packet" },
  { id: "CC-PPM-30G", name: "Peri Peri Makhana", packSize: "30 g packet" },
];

export const productName = (id: string | null) =>
  id ? PRODUCTS.find((p) => p.id === id)?.name ?? id : "Unmapped SKU";

/**
 * Default SKU mappings. Zepto MC-PACK6 starts unmapped so the reviewer can resolve it
 * (Masala Chips × 6) and watch packet equivalents recalculate.
 */
export const DEFAULT_SKU_MAPPINGS: SkuMapping[] = [
  { channel: "shopify", sourceSku: "MASALA-SINGLE", sourceName: "Masala Chips 40g", canonicalProductId: "CC-MSL-40G", packetMultiplier: 1 },
  { channel: "amazon", sourceSku: "MC-01", sourceName: "Crunch & Co. Masala Chips, 40g", canonicalProductId: "CC-MSL-40G", packetMultiplier: 1 },
  { channel: "blinkit", sourceSku: "BLK-100482", sourceName: "Crunch & Co Masala Chips 40 g", canonicalProductId: "CC-MSL-40G", packetMultiplier: 1 },
  { channel: "zepto", sourceSku: "MC-SINGLE", sourceName: "Masala Chips (40 g)", canonicalProductId: "CC-MSL-40G", packetMultiplier: 1 },
  { channel: "zepto", sourceSku: "MC-PACK6", sourceName: "Masala Chips Pack of 6 (6 × 40 g)", canonicalProductId: null, packetMultiplier: null },
  { channel: "instamart", sourceSku: "IM-559102", sourceName: "Crunch&Co Masala Chips 40g", canonicalProductId: "CC-MSL-40G", packetMultiplier: 1 },
];

export const mappingKey = (m: { channel: string; sourceSku: string }) => `${m.channel}:${m.sourceSku}`;
