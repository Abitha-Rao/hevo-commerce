import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { GitBranch, ArrowRight, Info } from "lucide-react";
import { useApp } from "@/state/store";
import { Badge, Callout, Card, CardHeader, PageHeader, Segmented, SidePanel } from "@/components/ui";
import { ChannelMark, LineStatusBadge } from "@/components/shared";
import { ChartTip } from "./Overview";
import { CHANNELS } from "@/data/channels";
import { CHANNEL_IDS } from "@/data/types";
import type { BridgeStep } from "@/lib/engine";
import { rupees } from "@/lib/format";
import { cn } from "@/lib/cn";

const COLOR = { total: "#4f46e5", subtotal: "#818cf8", up: "#059669", down: "#dc2626", excluded: "#cbd5e1" };
const stepColor = (s: BridgeStep) => (s.kind === "total" ? COLOR.total : s.kind === "subtotal" ? COLOR.subtotal : s.kind === "excluded" ? COLOR.excluded : s.value >= 0 ? COLOR.up : COLOR.down);

function StepPanel({ step, onClose }: { step: BridgeStep | null; onClose: () => void }) {
  const app = useApp();
  if (!step) return null;
  const lines = app.report.lines.filter((l) => step.recordRefs.includes(l.record.ref));
  return (
    <SidePanel open onClose={onClose} title={step.label} subtitle={`Normalization Bridge · ${app.report.weekLabel} · ${app.report.versionLabel}`}>
      <div className="space-y-5 text-[12.5px]">
        <div className="grid grid-cols-3 gap-3">
          {[["Before", step.kind === "total" || step.kind === "subtotal" ? "—" : rupees(step.start)], ["Change", step.kind === "total" || step.kind === "subtotal" ? "—" : step.kind === "excluded" ? "Excluded" : rupees(step.value, { sign: true })], ["After", rupees(step.end)]].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-slate-200 p-3"><div className="label">{k}</div><div className="mt-1 text-lg font-semibold tabular">{v}</div></div>
          ))}
        </div>
        <section><h3 className="mb-1 font-semibold">Explanation</h3><p className="text-slate-600">{step.explanation}</p></section>
        <section><h3 className="mb-1 font-semibold">Transformation rule</h3><code className="block rounded-md bg-slate-900 px-3 py-2 font-mono text-[11.5px] text-slate-100">{step.rule}</code></section>
        <section><h3 className="mb-1 font-semibold">Evidence status</h3><Badge tone="violet">{step.evidence}</Badge></section>
        {lines.length > 0 && (
          <section>
            <h3 className="mb-1.5 font-semibold">Affected source records</h3>
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="w-full text-[12px]">
                <thead><tr><th className="th">Ref</th><th className="th">Channel</th><th className="th num">Gross</th><th className="th num">Normalized</th><th className="th">Status</th></tr></thead>
                <tbody>{lines.map((l, i) => (
                  <tr key={i}>
                    <td className="td font-mono font-semibold">{l.record.ref}</td>
                    <td className="td">{CHANNELS[l.record.sourceChannel].short}</td>
                    <td className="td num">{rupees(l.record.transactionType === "refund" ? -l.record.refund : l.record.grossMerchandiseValue)}</td>
                    <td className="td num">{l.status === "included" ? rupees(l.normalizedSales) : "—"}</td>
                    <td className="td"><LineStatusBadge s={l.status} /></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </section>
        )}
        <section>
          <h3 className="mb-1.5 font-semibold">Source lineage</h3>
          <ol className="space-y-1">
            {step.lineage.length ? step.lineage.map((x) => <li key={x} className="flex gap-2 font-mono text-[11.5px] text-slate-600"><GitBranch className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />{x}</li>) : <li className="text-slate-500">Derived from the steps above.</li>}
          </ol>
          <p className="mt-2 text-[11.5px] text-slate-500">Source file → adapter → canonical row → rule → metric.</p>
        </section>
      </div>
    </SidePanel>
  );
}

export function Reconciliation() {
  const app = useApp();
  const r = app.report;
  const [sel, setSel] = useState<BridgeStep | null>(null);
  const data = r.bridge.map((s) => ({ ...s, base: Math.min(s.start, s.end), bar: Math.max(Math.abs(s.end - s.start), s.kind === "excluded" ? 0 : 0) }));
  const w47 = app.week === "W47";

  return (
    <div className="space-y-5">
      <PageHeader title="Reconciliation" description="A Normalization Bridge — not an accounting reconciliation. It shows, step by step, how mixed raw channel figures become comparable consumer sell-out." />

      {w47 ? (
        <Card className="p-4">
          <div className="label mb-2">Scenario controls</div>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { l: "Report version", el: <Segmented label="Report version" value={app.scenario.snapshot} onChange={(v) => app.setScenario({ snapshot: v })} options={[{ value: "monday", label: "Monday snapshot" }, { value: "tuesday", label: "After Tuesday refund" }]} /> },
              { l: "Blinkit sell-out", el: <Segmented label="Blinkit sell-out" value={app.scenario.blinkitSellOut ? "y" : "n"} onChange={(v) => app.setScenario({ blinkitSellOut: v === "y" })} options={[{ value: "y", label: "Available" }, { value: "n", label: "Unavailable", tone: "warn" }]} /> },
              { l: "Instamart order date", el: <Segmented label="Instamart order date" value={app.scenario.instamartOrderDate ? "y" : "n"} onChange={(v) => app.setScenario({ instamartOrderDate: v === "y" })} options={[{ value: "y", label: "Available" }, { value: "n", label: "Unavailable", tone: "warn" }]} /> },
            ].map((x) => <div key={x.l}><div className="mb-1 text-[12px] font-medium text-slate-600">{x.l}</div>{x.el}</div>)}
          </div>
        </Card>
      ) : <Callout tone="slate" title="Week 46 is final">Scenario controls apply to the open week (16–22 Nov).</Callout>}

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Raw mixed-metric total", rupees(r.rawTotal), "Not a meaningful number"],
          [r.snapshot === "monday" ? "Comparable Monday sell-out" : "Restated weekly sell-out", rupees(r.comparableTotal), `${r.version} · ${r.versionLabel}`],
          ["Coverage", `${r.comparableChannels.length} of 5`, r.excludedChannels.length ? `Excluded, not zero: ${r.excludedChannels.map((c) => CHANNELS[c].short).join(", ")}` : "All channels comparable"],
          ["Wholesale sell-in", rupees(r.sellInTotal), "Separate · never added"],
        ].map(([k, v, s], i) => (
          <Card key={k} className={cn("p-4", i === 1 && "border-brand-200 ring-1 ring-brand-100")}>
            <div className="label">{k}</div><div className={cn("mt-1 text-xl font-semibold tabular", i === 1 && "text-brand-700", i === 3 && "text-sky-700")}>{v}</div><div className="text-[11.5px] text-slate-500">{s}</div>
          </Card>
        ))}
      </div>

      <div data-tour="bridge" className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Normalization Bridge" subtitle="Click any bar or step to open its explanation, rule, evidence and lineage." />
          <div className="px-2 pb-3">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data} margin={{ top: 22, right: 12, left: 4, bottom: 4 }} barCategoryGap="22%">
                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="short" tick={{ fontSize: 10.5, fill: "#475569" }} interval={0} angle={-28} textAnchor="end" axisLine={false} tickLine={false} height={62} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} width={52} />
                <Tooltip cursor={{ fill: "#f8fafc" }} content={<ChartTip fmt={(p) => <><b>{String(p.label)}</b><div className="tabular">{p.kind === "excluded" ? "Excluded — not zero" : p.kind === "delta" ? rupees(Number(p.value), { sign: true }) : rupees(Number(p.value))}</div><div className="text-slate-500">Click for lineage</div></>} />} />
                <Bar dataKey="base" stackId="w" fill="transparent" isAnimationActive={false} />
                <Bar dataKey="bar" stackId="w" radius={[4, 4, 0, 0]} minPointSize={3} className="cursor-pointer" onClick={(d: { id?: string }) => setSel(r.bridge.find((s) => s.id === d.id) ?? null)}>
                  {data.map((d) => <Cell key={d.id} fill={stepColor(d)} />)}
                  <LabelList dataKey="bar" content={(props) => {
                    const { x = 0, y = 0, width = 0, index = 0 } = props as { x?: number; y?: number; width?: number; index?: number };
                    const d = data[index];
                    const t = d.kind === "excluded" ? "excl." : d.kind === "delta" ? rupees(d.value, { sign: true }) : rupees(d.value);
                    return <text x={Number(x) + Number(width) / 2} y={Number(y) - 6} textAnchor="middle" fontSize={11} fontWeight={600} fill={d.kind === "excluded" ? "#b45309" : "#0f172a"}>{t}</text>;
                  }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 px-3 text-[11px] text-slate-500">
              {[["Total", COLOR.total], ["Increase", COLOR.up], ["Decrease", COLOR.down], ["Excluded (not zero)", COLOR.excluded]].map(([l, c]) => <span key={l} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} />{l}</span>)}
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader title="Steps & source lineage" subtitle="Each step ties back to source records." />
          <ol className="divide-y divide-slate-100 border-t border-slate-100">
            {r.bridge.map((s) => (
              <li key={s.id}>
                <button onClick={() => setSel(s)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: stepColor(s) }} />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-[12.5px]", s.kind === "total" ? "font-semibold" : "font-medium")}>{s.label}</span>
                    {s.recordRefs.length > 0 && s.kind !== "total" && <span className="font-mono text-[11px] text-slate-500">{s.recordRefs.join(", ")}</span>}
                  </span>
                  <span className={cn("tabular text-[12.5px]", s.kind === "total" ? "font-semibold" : s.kind === "excluded" ? "text-amber-700" : s.value < 0 ? "text-red-700" : "text-emerald-700")}>
                    {s.kind === "excluded" ? "Excluded" : s.kind === "delta" ? rupees(s.value, { sign: true }) : rupees(s.value)}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
                </button>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <Card>
        <CardHeader title="Raw vs comparable by channel" subtitle="Why each channel's own report differs from comparable consumer sell-out." />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[12.5px]">
            <thead><tr><th className="th">Channel</th><th className="th">Raw report basis</th><th className="th num">Raw</th><th className="th num">Comparable</th><th className="th num">Sell-in (separate)</th><th className="th">Status</th></tr></thead>
            <tbody>
              {CHANNEL_IDS.map((c) => {
                const ch = r.channels[c];
                return (
                  <tr key={c} className="cursor-pointer hover:bg-slate-50" onClick={() => app.openChannel(c)}>
                    <td className="td"><span className="flex items-center gap-2"><ChannelMark id={c} size="sm" />{CHANNELS[c].short}</span></td>
                    <td className="td text-slate-600">{ch.rawBasis}</td>
                    <td className="td num">{rupees(ch.raw)}</td>
                    <td className="td num font-semibold">{ch.normalized === null ? <span className="font-normal text-amber-700">Excluded</span> : rupees(ch.normalized)}</td>
                    <td className="td num text-sky-700">{ch.sellIn ? rupees(ch.sellIn) : "—"}</td>
                    <td className="td">{ch.status === "comparable" ? <Badge tone="green" dot>Comparable</Badge> : <Badge tone="amber" dot>Excluded · not zero</Badge>}</td>
                  </tr>
                );
              })}
              <tr className="bg-slate-50 font-semibold">
                <td className="td" colSpan={2}>Total</td><td className="td num">{rupees(r.rawTotal)}</td><td className="td num text-brand-700">{rupees(r.comparableTotal)}</td><td className="td num text-sky-700">{rupees(r.sellInTotal)}</td><td className="td">{r.comparableChannels.length}/5</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Callout tone="slate" icon={<Info className="h-4 w-4" />} title="Synthetic scenario">
        All amounts exclude tax and shipping. Instamart's delivery-date basis and Blinkit's sell-in raw figure are illustrative assumptions, not verified platform behaviour.
      </Callout>
      <StepPanel step={sel} onClose={() => setSel(null)} />
    </div>
  );
}
