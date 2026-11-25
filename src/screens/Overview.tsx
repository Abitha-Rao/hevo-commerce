import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Ban, ChevronRight, FlaskConical, Package, Target, Truck, Layers, MapPin, ShieldCheck } from "lucide-react";
import { useApp } from "@/state/store";
import { Badge, Button, Callout, Card, CardHeader, Hint, Segmented } from "@/components/ui";
import { ChannelMark } from "@/components/shared";
import { ReadinessBadge } from "@/components/layout/Shell";
import { CHANNELS } from "@/data/channels";
import { CHANNEL_IDS } from "@/data/types";
import { dateTime, num, pct, rupees } from "@/lib/format";
import { cn } from "@/lib/cn";

const AXIS = { fontSize: 11, fill: "#64748b" };

export function ChartTip({ active, payload, fmt }: { active?: boolean; payload?: { payload: Record<string, unknown> }[]; fmt: (p: Record<string, unknown>) => React.ReactNode }) {
  if (!active || !payload?.length) return null;
  return <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] shadow-pop">{fmt(payload[0].payload)}</div>;
}

export function SnapshotToggle() {
  const app = useApp();
  if (app.week !== "W47") return <Badge tone="slate">Final · no revisions</Badge>;
  return (
    <Segmented
      label="Report version"
      value={app.scenario.snapshot}
      onChange={(v) => app.setScenario({ snapshot: v })}
      options={[
        { value: "monday", label: "Monday snapshot · v1" },
        { value: "tuesday", label: "After Tuesday refund · v2" },
      ]}
    />
  );
}

export function PilotCriteria({ compact }: { compact?: boolean }) {
  return (
    <Card>
      <CardHeader
        icon={<Target className="h-4 w-4 text-brand-600" />}
        title="Pilot Success Criteria"
        subtitle="Proposed targets for an 8-week design-partner pilot. Not achieved results — nothing has been piloted."
        right={<Badge tone="indigo">Proposed</Badge>}
      />
      <div className={cn("grid gap-4 px-4 pb-4", compact ? "lg:grid-cols-2" : "md:grid-cols-2")}>
        <div>
          <div className="label mb-2">Targets</div>
          <ul className="space-y-2 text-[12.5px] text-slate-700">
            {[
              ["7 of 8", "Mondays with a trusted report by 9:00 AM IST, without manual Excel reconciliation"],
              ["< 30 min", "Analyst preparation time, including uploads and exception resolution"],
              ["≥ 95%", "Agreed eligible source-period datasets received and validated"],
              ["< 1%", "Error against manually validated comparable source totals"],
            ].map(([k, v]) => (
              <li key={k} className="flex gap-3">
                <span className="w-16 shrink-0 font-semibold text-slate-900 tabular">{k}</span>
                <span>{v}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="label mb-2">Guardrails</div>
          <ul className="space-y-2 text-[12.5px] text-slate-700">
            {["Missing data never becomes zero sales.", "Sell-in and sell-out are never double-counted.", "City-level data is never invented.", "Historical revisions are traceable."].map((g) => (
              <li key={g} className="flex gap-2"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />{g}</li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

function Kpi({ label, value, sub, hint, accent, children }: { label: string; value: React.ReactNode; sub?: React.ReactNode; hint?: string; accent?: boolean; children?: React.ReactNode }) {
  return (
    <div className={cn("rounded-lg border bg-white p-4 shadow-card", accent ? "border-brand-200 ring-1 ring-brand-100" : "border-slate-200")}>
      <div className="flex items-center gap-1.5 label">{label}{hint && <Hint>{hint}</Hint>}</div>
      <div className={cn("mt-1.5 font-semibold tracking-tight tabular text-slate-900", accent ? "text-[28px] leading-8" : "text-xl")}>{value}</div>
      {sub && <div className="mt-1 text-[12px] text-slate-500">{sub}</div>}
      {children}
    </div>
  );
}

export function Overview() {
  const app = useApp();
  const r = app.report;
  const g = app.growth;
  const [unit, setUnit] = [app.unit, (u: "inr" | "packets") => app.set("unit", u)];
  const [cityUnit, setCityUnit] = useState<"inr" | "packets">("inr");
  const isPk = unit === "packets";

  const channelData = CHANNEL_IDS.map((c) => {
    const ch = r.channels[c];
    return {
      id: c,
      name: CHANNELS[c].short,
      value: ch.status === "excluded" ? 0 : isPk ? ch.packets ?? 0 : ch.normalized ?? 0,
      excluded: ch.status === "excluded",
      share: ch.normalized !== null && r.comparableTotal ? (ch.normalized / r.comparableTotal) : null,
      raw: ch.raw,
      unmapped: ch.unmappedUnits,
    };
  });

  const growthData = g.contributions.map((c) => ({ id: c.channel, name: CHANNELS[c.channel].short, delta: c.delta ?? 0, na: c.delta === null, cur: c.current, prior: c.prior }));
  const productData = r.products.map((p) => ({ name: p.label, value: isPk ? p.packets : p.sales, unmapped: p.key === "__unmapped", units: p.unmappedUnits, sales: p.sales, packets: p.packets }));
  const cityData = r.cities.map((c) => ({ ...c, value: cityUnit === "packets" ? c.packets : c.sales }));
  const topCity = r.cities.find((c) => c.granularity === "city");

  const alerts: React.ReactNode[] = [];
  for (const c of r.excludedChannels) {
    const ch = r.channels[c];
    alerts.push(
      <Callout key={c} tone={ch.excludedByAnalyst ? "amber" : "red"} icon={<Ban className="h-4 w-4" />}
        title={`${CHANNELS[c].name} is ${ch.excludedByAnalyst ? "excluded by the analyst" : "missing or cannot be normalized"} — excluded, not counted as zero`}
        action={<Button size="sm" variant="secondary" onClick={() => app.navigate("quality")}>Resolve</Button>}>
        {ch.excludedReason}. Comparable sell-out covers {r.comparableChannels.length} of 5 channels{c === "blinkit" ? `; Blinkit wholesale sell-in (${rupees(ch.sellIn)}) is still shown separately` : ""}.
      </Callout>,
    );
  }
  if (r.unsupported.length)
    alerts.push(
      <Callout key="unsup" tone="amber" icon={<AlertTriangle className="h-4 w-4" />} title="Selected sales definition is partly unsupported by available data"
        action={<Button size="sm" variant="secondary" onClick={() => app.navigate("model")}>Review</Button>}>
        {r.unsupported.map((u) => `${u.control}: ${u.selected}`).join(" · ")}. Figures below use the supported default for those settings.
      </Callout>,
    );
  if (app.readiness.blocking && app.week === "W47")
    alerts.push(
      <Callout key="block" tone="red" icon={<AlertTriangle className="h-4 w-4" />} title={`${app.readiness.blocking} blocking data-quality exception${app.readiness.blocking > 1 ? "s" : ""} before the next publish`}
        action={<Button size="sm" variant="secondary" onClick={() => app.navigate("quality")}>Open queue</Button>}>
        Held records are kept out of every total until resolved.
      </Callout>,
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[12px] text-slate-500">
            <span>{r.weekLabel} · Monday–Sunday IST</span><span>·</span><span>{r.versionLabel} ({r.version})</span>
          </div>
          <h1 className="mt-1 max-w-3xl text-[19px] font-semibold leading-snug tracking-tight text-slate-900">
            Crunch &amp; Co. sold <span className="text-brand-700 tabular">{rupees(r.comparableTotal)}</span> to consumers
            {g.available ? (
              <>, {g.abs >= 0 ? "up" : "down"} <span className="tabular">{rupees(Math.abs(g.abs))}</span> ({pct(g.pct)}) on last week{g.largest && <>. {CHANNELS[g.largest.channel].short} added the most (<span className="tabular">{rupees(g.largest.delta, { sign: true })}</span>)</>}.</>
            ) : (
              <>. No prior-week data exists to compare against.</>
            )}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SnapshotToggle />
        </div>
      </div>

      {alerts.length > 0 && <div className="space-y-2">{alerts}</div>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <div className="sm:col-span-2">
          <Kpi accent label="Comparable consumer sell-out" value={rupees(r.comparableTotal)} hint="Merchandise value after customer-facing discounts, before tax and shipping, by original order date (IST). Measures consumer purchases — not brand revenue."
            sub={<>As of {dateTime(r.asOf)} · {r.version === "v2" ? <Badge tone="amber">Revised</Badge> : <Badge tone="slate">Original</Badge>}</>} />
        </div>
        <Kpi label="Week-on-week" hint="Like-for-like: only channels comparable in both weeks. Prior week (9–15 Nov) is a separate synthetic dataset."
          value={g.available ? <span className={cn("inline-flex items-center gap-1", g.abs >= 0 ? "text-emerald-700" : "text-red-700")}>{g.abs >= 0 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}{pct(g.pct)}</span> : "n/a"}
          sub={g.available ? <>{rupees(g.abs, { sign: true })} vs {rupees(g.prior)}{g.reason && <span className="block text-amber-700">{g.reason}</span>}</> : g.reason} />
        <Kpi label="Packet equivalents" hint="Selling units × pack multiplier. A 6-pack counts as 6 packets."
          value={num(r.packets)}
          sub={r.unmappedUnits ? <span className="text-amber-700">Incomplete: {r.unmappedUnits} unit unmapped ({rupees(r.unmappedSales)})</span> : "All SKUs mapped"} />
        <Kpi label="Wholesale sell-in" hint="Brand-to-platform invoices. A separate measure — never added to consumer sell-out."
          value={<span className="text-sky-700">{rupees(r.sellInTotal)}</span>} sub={`${r.sellInPackets} packets · Blinkit · reported separately`} />
        <Kpi label="Coverage & readiness" value={<span>{r.comparableChannels.length}<span className="text-slate-400"> / 5</span></span>}
          sub={<span className="flex flex-col items-start gap-1"><span>channels comparable</span>{app.week === "W47" ? <ReadinessBadge size="sm" /> : <Badge tone="green">Published · final</Badge>}</span>} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Channel contribution to sales" subtitle="Click a channel for its breakdown and source details."
            icon={<Layers className="h-4 w-4 text-slate-400" />}
            right={<Segmented size="sm" label="Unit" value={unit} onChange={setUnit} options={[{ value: "inr", label: "₹" }, { value: "packets", label: "Packets" }]} />} />
          <div className="px-2 pb-3">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={channelData} layout="vertical" margin={{ left: 8, right: 70, top: 4, bottom: 4 }} barCategoryGap={8}>
                <CartesianGrid horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} tickFormatter={(v) => (isPk ? v : `₹${v}`)} />
                <YAxis type="category" dataKey="name" tick={{ ...AXIS, fill: "#334155", fontWeight: 500 }} axisLine={false} tickLine={false} width={74} />
                <Tooltip cursor={{ fill: "#f8fafc" }} content={<ChartTip fmt={(p) => p.excluded ? <><b>{String(p.name)}</b><div className="text-amber-700">Excluded — not zero</div></> : <><b>{String(p.name)}</b><div className="tabular">{isPk ? `${p.value} packets` : rupees(Number(p.value))}{p.share !== null && !isPk ? ` · ${pct(Number(p.share)).replace("+", "")} of total` : ""}</div><div className="text-slate-500">Raw report: {rupees(Number(p.raw))}</div></>} />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} onClick={(d: { id?: string }) => d.id && app.openChannel(d.id as never)} className="cursor-pointer" minPointSize={2}>
                  {channelData.map((d) => <Cell key={d.id} fill={d.excluded ? "#e2e8f0" : CHANNELS[d.id].color} />)}
                  <LabelList dataKey="value" position="right" content={(props) => {
                    const { x = 0, y = 0, width = 0, height = 0, index = 0 } = props as { x?: number; y?: number; width?: number; height?: number; index?: number };
                    const d = channelData[index];
                    return <text x={Number(x) + Number(width) + 6} y={Number(y) + Number(height) / 2 + 4} fontSize={11.5} fill={d.excluded ? "#b45309" : "#0f172a"} fontWeight={500}>{d.excluded ? "Excluded" : isPk ? `${d.value}${d.unmapped ? "*" : ""}` : rupees(d.value)}</text>;
                  }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-1.5 px-2">
              {CHANNEL_IDS.map((c) => (
                <button key={c} onClick={() => app.openChannel(c)} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1 text-[11.5px] font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50">
                  <ChannelMark id={c} size="sm" />{CHANNELS[c].short}<ChevronRight className="h-3 w-3 text-slate-400" />
                </button>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Contribution to week-on-week growth" subtitle={g.available ? `Absolute change vs ${app.priorReport?.weekLabel} (synthetic prior week), like-for-like` : "Unavailable"}
            icon={<ArrowUpRight className="h-4 w-4 text-slate-400" />} />
          {g.available ? (
            <div className="px-2 pb-3">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={growthData} layout="vertical" margin={{ left: 8, right: 70, top: 4, bottom: 4 }} barCategoryGap={8}>
                  <CartesianGrid horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                  <YAxis type="category" dataKey="name" tick={{ ...AXIS, fill: "#334155", fontWeight: 500 }} axisLine={false} tickLine={false} width={74} />
                  <ReferenceLine x={0} stroke="#94a3b8" />
                  <Tooltip cursor={{ fill: "#f8fafc" }} content={<ChartTip fmt={(p) => p.na ? <><b>{String(p.name)}</b><div className="text-amber-700">Not comparable in both weeks — excluded from growth</div></> : <><b>{String(p.name)}</b><div className="tabular">{rupees(Number(p.delta), { sign: true })}</div><div className="text-slate-500 tabular">{rupees(Number(p.prior))} → {rupees(Number(p.cur))}</div></>} />} />
                  <Bar dataKey="delta" radius={4} onClick={(d: { id?: string }) => d.id && app.openChannel(d.id as never)} className="cursor-pointer" minPointSize={2}>
                    {growthData.map((d) => <Cell key={d.id} fill={d.na ? "#e2e8f0" : d.delta >= 0 ? "#059669" : "#dc2626"} />)}
                    <LabelList dataKey="delta" content={(props) => {
                      const { x = 0, y = 0, width = 0, height = 0, index = 0 } = props as { x?: number; y?: number; width?: number; height?: number; index?: number };
                      const d = growthData[index];
                      return <text x={Number(x) + Math.max(Number(width), 0) + 6} y={Number(y) + Number(height) / 2 + 4} fontSize={11.5} fill={d.na ? "#b45309" : "#0f172a"} fontWeight={500}>{d.na ? "n/a" : rupees(d.delta, { sign: true })}{g.largest?.channel === d.id ? " ★" : ""}</text>;
                    }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="px-2 text-[11.5px] text-slate-500">★ Largest absolute contributor. {g.reason ?? "All five channels comparable in both weeks."}</p>
            </div>
          ) : (
            <div className="px-4 pb-6 text-[12.5px] text-slate-500">{g.reason}</div>
          )}
        </Card>

        <Card>
          <CardHeader title="Product performance" subtitle={isPk ? "Packet equivalents by canonical product" : "Comparable sell-out by canonical product"}
            icon={<Package className="h-4 w-4 text-slate-400" />}
            right={<Segmented size="sm" label="Unit" value={unit} onChange={setUnit} options={[{ value: "inr", label: "₹" }, { value: "packets", label: "Packets" }]} />} />
          <div className="px-4 pb-4">
            <div className="space-y-2.5">
              {productData.map((p) => {
                const max = Math.max(...productData.map((x) => x.value), 1);
                return (
                  <div key={p.name}>
                    <div className="mb-1 flex items-center justify-between text-[12.5px]">
                      <span className={cn("font-medium", p.unmapped && "text-amber-800")}>{p.name}{p.unmapped && <Badge tone="amber" className="ml-2">Needs mapping</Badge>}</span>
                      <span className="tabular text-slate-700">{isPk ? (p.unmapped ? `${p.units} unit · not converted` : `${p.value} packets`) : rupees(p.value)}</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-100">
                      <div className={cn("h-2.5 rounded-full", p.unmapped ? "hatch bg-amber-300" : "bg-brand-600")} style={{ width: `${isPk && p.unmapped ? 0 : (p.value / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[11.5px] text-slate-500">
              The synthetic week contains one product line (Masala Chips) in single packets and a 6-pack.
              {r.unmappedUnits > 0 && <> One Zepto SKU is unmapped — <button className="font-medium text-brand-700 hover:underline" onClick={() => app.navigate("model")}>map it in the Sales Model</button>.</>}
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader title="City breakdown" subtitle="Only where the source provides a city. State-only and unknown geography are shown separately — never allocated."
            icon={<MapPin className="h-4 w-4 text-slate-400" />}
            right={<Segmented size="sm" label="Unit" value={cityUnit} onChange={setCityUnit} options={[{ value: "inr", label: "₹" }, { value: "packets", label: "Packets" }]} />} />
          <div className="px-4 pb-4">
            <table className="w-full text-[12.5px]">
              <tbody>
                {cityData.map((c) => {
                  const max = Math.max(...cityData.map((x) => x.value), 1);
                  return (
                    <tr key={c.key}>
                      <td className="w-[38%] py-1.5 pr-2">
                        <div className={cn("font-medium", c.granularity !== "city" && "text-slate-500")}>{c.label}</div>
                      </td>
                      <td className="py-1.5">
                        <div className="h-2.5 w-full rounded-full bg-slate-50">
                          <div className={cn("h-2.5 rounded-full", c.granularity === "city" ? "bg-brand-600" : c.granularity === "state" ? "bg-slate-400" : "hatch bg-slate-200")} style={{ width: `${(c.value / max) * 100}%` }} />
                        </div>
                      </td>
                      <td className="w-24 py-1.5 pl-3 text-right tabular">{cityUnit === "packets" ? `${c.value}${c.unmappedUnits ? "*" : ""}` : rupees(c.value)}</td>
                      <td className="w-24 py-1.5 pl-2 text-right">
                        <Badge tone={c.granularity === "city" ? "green" : c.granularity === "state" ? "slate" : "amber"}>{c.granularity === "city" ? "Verified city" : c.granularity === "state" ? "State only" : "Unknown"}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 text-[11.5px] text-slate-500">
              {topCity && <>Top verified city: <b className="text-slate-700">{topCity.label}</b>. </>}
              Zepto and Instamart downloads carry no city; one Amazon order carries state only.
            </p>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <Card>
          <CardHeader title="Source status" subtitle="What this number is built from" icon={<Truck className="h-4 w-4 text-slate-400" />}
            right={<Button size="sm" variant="ghost" onClick={() => app.navigate("sources")}>All sources <ChevronRight className="h-3.5 w-3.5" /></Button>} />
          <ul className="divide-y divide-slate-100 px-4 pb-2">
            {CHANNEL_IDS.map((c) => {
              const ch = r.channels[c];
              return (
                <li key={c}>
                  <button onClick={() => app.openChannel(c)} className="flex w-full items-center gap-3 py-2 text-left hover:bg-slate-50/60">
                    <ChannelMark id={c} size="sm" />
                    <span className="flex-1 text-[12.5px] font-medium">{CHANNELS[c].name}</span>
                    <span className="text-[11.5px] text-slate-500">{CHANNELS[c].kind === "connector" ? "Connector (simulated)" : "File folders"}</span>
                    {ch.status === "comparable" ? <Badge tone="green" dot>Comparable</Badge> : <Badge tone="amber" dot>Excluded</Badge>}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center gap-1.5 border-t border-slate-100 px-4 py-2.5 text-[11.5px] text-slate-500">
            <FlaskConical className="h-3.5 w-3.5 text-violet-500" /> Connections are simulated; every record is synthetic.
          </div>
        </Card>
        <PilotCriteria compact />
      </div>
    </div>
  );
}
