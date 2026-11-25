import type { CanonicalSalesRecord, ChannelId, WeekId } from "@/data/types";
import { CHANNEL_IDS } from "@/data/types";
import { shopifyAdapter } from "./shopify";
import { amazonAdapter } from "./amazon";
import { blinkitAdapter } from "./blinkit";
import { zeptoAdapter } from "./zepto";
import { instamartAdapter } from "./instamart";
import type { SourceAdapter } from "./common";

export * from "./common";

export const ADAPTERS: Record<ChannelId, SourceAdapter> = {
  shopify: shopifyAdapter,
  amazon: amazonAdapter,
  blinkit: blinkitAdapter,
  zepto: zeptoAdapter,
  instamart: instamartAdapter,
};

/**
 * Run every adapter for a week and apply deterministic duplicate detection:
 * the same (channel, sourceRecordId, transactionType) seen twice → the later
 * ingested copy is flagged duplicateOf the first.
 */
export function ingestWeek(week: WeekId): CanonicalSalesRecord[] {
  const rows = CHANNEL_IDS.flatMap((c) => ADAPTERS[c].toCanonical(week));
  const seen = new Map<string, CanonicalSalesRecord>();
  const sorted = [...rows].sort((a, b) => a.ingestedAt.localeCompare(b.ingestedAt));
  for (const r of sorted) {
    const key = `${r.sourceChannel}|${r.sourceRecordId}|${r.transactionType}`;
    const first = seen.get(key);
    if (first) r.duplicateOf = first.sourceFile;
    else seen.set(key, r);
  }
  return rows;
}
