import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, Lock, RotateCcw, ShoppingBag, Truck, Wallet, Table2, MapPin, Boxes } from "lucide-react";
import { useApp } from "@/state/store";
import { Badge, Button, Card, CardHeader, Hint, PageHeader, Segmented, Select } from "@/components/ui";
import { ChannelMark, LineStatusBadge } from "@/components/shared";
import { CHANNELS } from "@/data/channels";
import { PRODUCTS, mappingKey, productName } from "@/data/catalog";
import { CHANNEL_IDS, DEFAULT_DEFINITION, type DiscountTreatment, type RecognitionDate, type ReportingPeriod } from "@/data/types";
import { computeWeekReport } from "@/lib/engine";
import { ingestWeek } from "@/lib/adapters";
import { dateTime, rupees } from "@/lib/format";
import { cn } from "@/lib/cn";

function MetricCards() {
  const app = useApp();
  const r = app.report;
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Card className="border-brand-300 p-4 ring-1 ring-brand-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[13.5px] font-semibold"><ShoppingBag className="h-4 w-4 text-brand-600" /> Consumer sell-out</div>
          <Badge tone="indigo">Primary weekly metric</Badge>
        </div>
        <p className="mt-2 text-[12.5px] text-slate-600">What consumers bought, across every channel, on one definition. Measures consumer purchases — not necessarily brand revenue.</p>
        <div className="mt-3 text-[22px] font-semibold tabular">{rupees(r.comparableTotal)}</div>
        <div className="text-[11.5px] text-slate-500">{r.weekLabel} · {r.version} · {r.comparableChannels.length}/5 channels</div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[13.5px] font-semibold"><Truck className="h-4 w-4 text-sky-600" /> Wholesale sell-in</div>
          <Badge tone="sky">Separate measure</Badge>
        </div>
        <p className="mt-2 text-[12.5px] text-slate-600">Stock invoiced by the brand to inventory-led platforms. Useful for supply planning; never added to sell-out.</p>
        <div className="mt-3 text-[22px] font-semibold tabular text-sky-700">{rupees(r.sellInTotal)}</div>
        <div className="text-[11.5px] text-slate-500">{r.sellInPackets} packets · Blinkit invoices</div>
      </Card>
      <Card className="border-dashed bg-slate-50/60 p-4 shadow-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[13.5px] font-semibold text-slate-600"><Wallet className="h-4 w-4 text-slate-400" /> Brand revenue</div>
          <Badge tone="slate"><Lock className="h-3 w-3" /> Future capability</Badge>
        </div>
        <p className="mt-2 text-[12.5px] text-slate-500">Revenue after platform commissions, fees and settlements. Requires settlement data from every channel — not implemented in this prototype.</p>
        <div className="mt-3 text-[22px] font-semibold text-slate-300">—</div>
        <div className="text-[11.5px] text-slate-400">Not calculated</div>
      </Card>
    </div>
  );
}

function Row({ label, hint, note, children }: { label: string; hint: string; note?: { reason: string }; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 border-b border-slate-100 py-3 last:border-0 sm:grid-cols-[200px_1fr] sm:items-start">
      <div className="flex items-center gap-1.5 pt-1.5 text-[12.5px] font-medium text-slate-700">{label}<Hint>{hint}</Hint></div>
      <div>
        {children}
        {note && (
          <div className="mt-1.5 flex items-start gap-1.5 text-[11.5px] text-amber-800">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> <span><b>Unsupported by available data.</b> {note.reason}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function DefinitionControls() {
  const app = useApp();
  const def = app.definition;
  const notes = app.report.unsupported;
  const isDefault = JSON.stringify(def) === JSON.stringify(DEFAULT_DEFINITION);
  const excluded = useMemo(() => {
    const out: Record<string, boolean> = {};
    if (app.resolutions["missing-blinkit-sellout"]?.status === "excluded") out.blinkit = true;
    return out;
  }, [app.resolutions]);
  const baseline = useMemo(
    () => ({
      monday: computeWeekReport({ week: app.week, scenario: { ...app.scenario, snapshot: "monday" }, definition: DEFAULT_DEFINITION, mappings: app.mappings, excludedByAnalyst: excluded }).comparableTotal,
      tuesday: computeWeekReport({ week: app.week, scenario: { ...app.scenario, snapshot: "tuesday" }, definition: DEFAULT_DEFINITION, mappings: app.mappings, excludedByAnalyst: excluded }).comparableTotal,
    }),
    [app.week, app.scenario, app.mappings, excluded],
  );
  const cur = { monday: app.reportFor("monday").comparableTotal, tuesday: app.reportFor("tuesday").comparableTotal };
  const noteFor = (control: string) => notes.find((n) => n.control === control);

  return (
    <Card data-tour="definition-controls">
      <CardHeader title="Consumer sell-out definition" subtitle="Whose sale it is, when it counts, and what amount counts." right={
        <Button size="sm" variant="ghost" disabled={isDefault} onClick={() => app.set("definition", DEFAULT_DEFINITION)}><RotateCcw className="h-3.5 w-3.5" /> Reset to default</Button>
      } />
      <div className="grid gap-5 px-4 pb-4 lg:grid-cols-[1fr_280px]">
        <div>
          <Row label="Reporting period" note={noteFor("Reporting period")} hint="The window a sale is bucketed into.">
            <Select label="Reporting period" value={def.reportingPeriod} onChange={(v) => app.setDefinition({ reportingPeriod: v as ReportingPeriod })} options={[
              { value: "mon_sun_ist", label: "Monday–Sunday, IST (default)" },
              { value: "sun_sat_ist", label: "Sunday–Saturday, IST" },
              { value: "calendar_month", label: "Calendar month" },
            ]} />
          </Row>
          <Row label="Sales recognition date" note={noteFor("Sales recognition date")} hint="Which timestamp places a sale in a period.">
            <Select label="Sales recognition date" value={def.recognitionDate} onChange={(v) => app.setDefinition({ recognitionDate: v as RecognitionDate })} options={[
              { value: "order_date", label: "Original order date (default)" },
              { value: "delivery_date", label: "Delivery date" },
              { value: "settlement_date", label: "Settlement date" },
            ]} />
          </Row>
          <Row label="Refund treatment" hint="Restated cohort revises the original week. Adjustment period books refunds in the week they happen.">
            <Segmented label="Refund treatment" value={def.refundTreatment} onChange={(v) => app.setDefinition({ refundTreatment: v })} options={[
              { value: "restate_cohort", label: "Restate original order week" },
              { value: "adjustment_period", label: "Book in adjustment week" },
            ]} />
          </Row>
          <Row label="Discount treatment" hint="Customer-facing discounts reduce what the consumer paid. Platform-funded discounts are paid for by the platform.">
            <Select label="Discount treatment" value={def.discountTreatment} onChange={(v) => app.setDefinition({ discountTreatment: v as DiscountTreatment })} options={[
              { value: "after_all", label: "After all customer-facing discounts (default)" },
              { value: "before_platform", label: "Before platform-funded discounts" },
              { value: "before_all", label: "Before all discounts (list value)" },
            ]} />
          </Row>
          <div className="mt-2 rounded-md bg-slate-50 px-3 py-2.5 text-[12px] text-slate-600">
            <div className="mb-1 font-semibold text-slate-800">Fixed in this definition</div>
            <ul className="grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
              <li>· Merchandise value, before tax</li>
              <li>· Excludes shipping</li>
              <li>· Cancelled orders excluded</li>
              <li>· Every version carries an as-of timestamp</li>
            </ul>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5">
          <div className="label">Live impact · {app.report.weekLabel}</div>
          {(["monday", "tuesday"] as const).filter((s) => app.week === "W47" || s === "monday").map((s) => {
            const d = cur[s] - baseline[s];
            return (
              <div key={s} className="mt-3">
                <div className="text-[11.5px] text-slate-500">{s === "monday" ? "Monday snapshot (v1)" : "After Tuesday refund (v2)"}</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-semibold tabular">{rupees(cur[s])}</span>
                  {d !== 0 && <span className={cn("text-[12px] font-medium tabular", d > 0 ? "text-emerald-700" : "text-red-700")}>{rupees(d, { sign: true })} vs default</span>}
                </div>
              </div>
            );
          })}
          <div className="mt-3 border-t border-slate-200 pt-3 text-[11.5px] text-slate-500">
            {isDefault ? (
              <span className="flex items-center gap-1.5 text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Using the recommended default</span>
            ) : notes.length ? (
              <span className="text-amber-800">{notes.length} setting{notes.length > 1 ? "s" : ""} can't be applied with available data; supported settings are applied.</span>
            ) : (
              "Recalculated from the canonical records. Changes flow to every screen and the weekly report."
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function SkuMapping() {
  const app = useApp();
  const records = useMemo(() => [...ingestWeek("W47"), ...ingestWeek("W46")].filter((r) => !r.duplicateOf && r.transactionType !== "refund"), []);
  return (
    <Card data-tour="sku-mapping">
      <CardHeader icon={<Boxes className="h-4 w-4 text-slate-400" />} title="Product mapping" subtitle="Source SKU → canonical product × pack multiplier. Packet equivalents = selling units × multiplier. Deterministic, analyst-confirmed — no automatic matching."
        right={app.mappings.some((m) => !m.canonicalProductId) ? <Badge tone="amber">{app.mappings.filter((m) => !m.canonicalProductId).length} unmapped</Badge> : <Badge tone="green">All mapped</Badge>} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-[12.5px]">
          <thead>
            <tr><th className="th">Channel</th><th className="th">Source SKU</th><th className="th">Canonical product</th><th className="th">Pack multiplier</th><th className="th num">Units (W47)</th><th className="th num">Packets (W47)</th><th className="th">Status</th></tr>
          </thead>
          <tbody>
            {app.mappings.map((m) => {
              const rows = records.filter((r) => r.week === "W47" && mappingKey({ channel: r.sourceChannel, sourceSku: r.sourceSku }) === mappingKey(m));
              const units = rows.reduce((s, r) => s + r.sellingUnits, 0);
              const unmapped = !m.canonicalProductId;
              return (
                <tr key={mappingKey(m)} className={cn(unmapped && "bg-amber-50/60")}>
                  <td className="td"><span className="flex items-center gap-2"><ChannelMark id={m.channel} size="sm" />{CHANNELS[m.channel].short}</span></td>
                  <td className="td"><div className="font-mono text-[12px] font-medium">{m.sourceSku}</div><div className="text-[11px] text-slate-500">{m.sourceName}</div></td>
                  <td className="td">
                    <Select label={`Canonical product for ${m.sourceSku}`} value={m.canonicalProductId ?? ""} className={cn("w-48", unmapped && "border-amber-300")}
                      onChange={(v) => {
                        const next = { ...m, canonicalProductId: v || null, packetMultiplier: v ? m.packetMultiplier ?? (/PACK6/.test(m.sourceSku) ? 6 : 1) : null };
                        app.updateMapping(next);
                        if (v && unmapped) app.toast({ tone: "success", title: `${m.sourceSku} mapped to ${productName(v)} × ${next.packetMultiplier}`, body: "Packet equivalents recalculated across every screen." });
                      }}
                      options={[{ value: "", label: "— Select product —" }, ...PRODUCTS.map((p) => ({ value: p.id, label: `${p.name} (${p.packSize})` }))]} />
                  </td>
                  <td className="td">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">×</span>
                      <input type="number" min={1} max={48} aria-label={`Pack multiplier for ${m.sourceSku}`} disabled={unmapped}
                        value={m.packetMultiplier ?? ""} placeholder="—"
                        onChange={(e) => {
                          const n = Math.max(1, Math.min(48, Math.round(Number(e.target.value) || 1)));
                          app.updateMapping({ ...m, packetMultiplier: n });
                        }}
                        className="h-8 w-16 rounded-md border border-slate-200 px-2 text-[13px] tabular shadow-sm disabled:bg-slate-50" />
                    </div>
                  </td>
                  <td className="td num">{units}</td>
                  <td className="td num font-medium">{m.packetMultiplier && m.canonicalProductId ? units * m.packetMultiplier : <span className="text-amber-700">—</span>}</td>
                  <td className="td">{unmapped ? <Badge tone="amber" dot>Needs mapping</Badge> : <Badge tone="green" dot>Mapped</Badge>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[12px] text-slate-500">
        <span>Total packet equivalents this week: <b className="text-slate-800 tabular">{app.report.packets}</b>{app.report.unmappedUnits ? <span className="text-amber-700"> · {app.report.unmappedUnits} selling unit not converted</span> : ""}</span>
        <span>Blinkit wholesale invoices use the same mapping (BLK-100482 × 1).</span>
      </div>
    </Card>
  );
}

function GeographyMapping() {
  const app = useApp();
  const included = app.report.lines.filter((l) => l.status === "included" && l.record.transactionType !== "refund");
  const rows = CHANNEL_IDS.map((c) => {
    const ls = included.filter((l) => l.record.sourceChannel === c);
    const by = (g: string) => ls.filter((l) => l.record.geoGranularity === g).length;
    return { c, city: by("city"), state: by("state"), unknown: by("unknown"), total: ls.length };
  });
  const field: Record<string, string> = { shopify: "shippingAddress.city / province", amazon: "ship-city / ship-state", blinkit: "city (sell-out report)", zepto: "— (no geography in download)", instamart: "— (schema unverified)" };
  return (
    <Card>
      <CardHeader icon={<MapPin className="h-4 w-4 text-slate-400" />} title="Geography mapping" subtitle="Each row keeps the most precise geography its source provides. A state is never split into cities." />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-[12.5px]">
          <thead><tr><th className="th">Channel</th><th className="th">Source field</th><th className="th num">Verified city</th><th className="th num">State only</th><th className="th num">Unknown</th><th className="th">Treatment</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.c}>
                <td className="td"><span className="flex items-center gap-2"><ChannelMark id={r.c} size="sm" />{CHANNELS[r.c].short}</span></td>
                <td className="td font-mono text-[11.5px] text-slate-600">{field[r.c]}</td>
                <td className="td num">{r.city}</td>
                <td className="td num">{r.state}</td>
                <td className="td num">{r.unknown}</td>
                <td className="td text-[12px] text-slate-600">{r.total === 0 ? <span className="text-amber-700">Excluded this week</span> : r.unknown === r.total ? "Reported as Unknown geography" : r.state ? "City where present, else state only" : "City-level"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SchemaPreview() {
  const app = useApp();
  const cols: [string, (l: (typeof app.report.lines)[number]) => React.ReactNode][] = [
    ["source_channel", (l) => l.record.sourceChannel],
    ["source_record_id", (l) => <span className="font-mono">{l.record.sourceRecordId.replace("gid://shopify/", "")}</span>],
    ["transaction_type", (l) => l.record.transactionType],
    ["commercial_model", (l) => l.record.commercialModel],
    ["order_date", (l) => dateTime(l.record.orderDate)],
    ["delivery_date", (l) => dateTime(l.record.deliveryDate)],
    ["adjustment_date", (l) => dateTime(l.record.adjustmentDate)],
    ["source_sku", (l) => <span className="font-mono">{l.record.sourceSku}</span>],
    ["canonical_product_id", (l) => l.canonicalProductId ?? <span className="text-amber-700">null</span>],
    ["selling_units", (l) => l.record.transactionType === "refund" ? -l.record.refundUnits : l.record.sellingUnits],
    ["packet_multiplier", (l) => l.packetMultiplier ?? "—"],
    ["packet_equivalents", (l) => l.packetEquivalents ?? "—"],
    ["gross_merchandise_value", (l) => rupees(l.record.grossMerchandiseValue)],
    ["customer_discount", (l) => rupees(l.record.customerDiscount)],
    ["tax", (l) => rupees(l.record.tax)],
    ["refund", (l) => rupees(l.record.refund)],
    ["normalized_sales", (l) => <b>{rupees(l.normalizedSales)}</b>],
    ["city", (l) => l.record.city ?? "—"],
    ["state", (l) => l.record.state ?? "—"],
    ["geo_granularity", (l) => l.record.geoGranularity],
    ["source_file", (l) => <span className="font-mono">{l.record.sourceFile.replace(/.*\//, "")}</span>],
    ["ingestion_timestamp", (l) => dateTime(l.record.ingestedAt)],
  ];
  return (
    <Card>
      <CardHeader icon={<Table2 className="h-4 w-4 text-slate-400" />} title="Canonical schema preview" subtitle={`commerce.sales_line · ${app.report.lines.length} rows for ${app.report.weekLabel} (${app.report.version}) · scroll horizontally`} right={<Badge tone="violet">Synthetic rows</Badge>} />
      <div className="max-h-[420px] overflow-auto border-t border-slate-200">
        <table className="w-max text-[11.5px]">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="th sticky left-0 z-20 bg-slate-50">ref</th>
              <th className="th">model status</th>
              {cols.map(([c]) => <th key={c} className="th font-mono normal-case">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {app.report.lines.map((l, i) => (
              <tr key={i} className="hover:bg-slate-50/60">
                <td className="td sticky left-0 bg-white font-mono font-semibold">{l.record.ref}</td>
                <td className="td"><LineStatusBadge s={l.status} /></td>
                {cols.map(([c, f]) => <td key={c} className="td whitespace-nowrap">{f(l)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function SalesModel() {
  return (
    <div className="space-y-5">
      <PageHeader title="Sales Model" description="A reusable business-level model on top of ingestion: one canonical schema, one explicit sales definition, and analyst-confirmed product and geography mappings." />
      <MetricCards />
      <DefinitionControls />
      <SkuMapping />
      <GeographyMapping />
      <SchemaPreview />
    </div>
  );
}
