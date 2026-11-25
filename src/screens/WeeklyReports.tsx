import { useState } from "react";
import { Send, CalendarClock, History, CheckCircle2, AlertTriangle, ExternalLink, FlaskConical } from "lucide-react";
import { useApp } from "@/state/store";
import { Badge, Button, Callout, Card, CardHeader, PageHeader, Segmented, Select, Switch } from "@/components/ui";
import { CHANNELS } from "@/data/channels";
import { computeGrowth, type WeekReport } from "@/lib/engine";
import { dateTime, pct, rupees } from "@/lib/format";
import { cn } from "@/lib/cn";

function EmailPreview({ r }: { r: WeekReport }) {
  const app = useApp();
  const g = computeGrowth(r, app.priorReport);
  const topProduct = r.products.find((p) => p.key !== "__unmapped");
  const topCity = r.cities.find((c) => c.granularity === "city");
  const revised = r.version === "v2";
  const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
    <tr><td className="py-1.5 pr-4 text-slate-500">{k}</td><td className="py-1.5 text-right font-medium tabular text-slate-900">{v}</td></tr>
  );
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-[12px] text-slate-600">
        <div><span className="text-slate-400">From:</span> Hevo Commerce &lt;reports@hevo.example&gt;</div>
        <div><span className="text-slate-400">To:</span> {app.schedule.recipient}</div>
        <div className="mt-1 text-[13.5px] font-semibold text-slate-900">Your weekly commerce sales | Crunch &amp; Co.{revised && " (revised)"}</div>
      </div>
      <div className="space-y-4 px-5 py-5 text-[13px]">
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-500">Week {r.weekLabel} · Monday–Sunday IST
          <Badge tone={revised ? "amber" : "slate"}>{revised ? "Revision v2 — supersedes Monday v1" : "Original v1"}</Badge>
        </div>
        <div>
          <div className="text-[12px] text-slate-500">Comparable consumer sales</div>
          <div className="text-[30px] font-semibold leading-9 tracking-tight tabular">{rupees(r.comparableTotal)}</div>
          {g.available && <div className={cn("text-[13px] font-medium", g.abs >= 0 ? "text-emerald-700" : "text-red-700")}>{rupees(g.abs, { sign: true })} ({pct(g.pct)}) vs last week{g.reason && <span className="font-normal text-slate-500"> · {g.reason}</span>}</div>}
        </div>
        <table className="w-full text-[12.5px]"><tbody>
          <Row k="Largest growth contributor" v={g.largest ? `${CHANNELS[g.largest.channel].short} ${rupees(g.largest.delta, { sign: true })}` : "—"} />
          <Row k="Top product" v={topProduct ? `${topProduct.label} · ${rupees(topProduct.sales)}` : "—"} />
          <Row k="Top city (verified only)" v={topCity ? `${topCity.label} · ${rupees(topCity.sales)}` : "None verified"} />
          <Row k="Packet equivalents" v={`${r.packets}${r.unmappedUnits ? ` (+${r.unmappedUnits} unmapped unit)` : ""}`} />
          <Row k="Wholesale sell-in (separate)" v={rupees(r.sellInTotal)} />
          <Row k="Coverage" v={`${r.comparableChannels.length} of 5 channels`} />
        </tbody></table>
        <div className="rounded-md bg-amber-50 px-3 py-2 text-[12px] text-amber-900 ring-1 ring-amber-200">
          <div className="font-semibold">Missing or non-comparable</div>
          {r.excludedChannels.length ? r.excludedChannels.map((c) => <div key={c}>· {CHANNELS[c].short}: {r.channels[c].excludedReason} — excluded, not counted as zero.</div>) : <div>· None. All five channels comparable.</div>}
          <div>· Zepto and Instamart have no city data; shown as unknown geography.</div>
        </div>
        <div className="text-[11.5px] text-slate-500">As of {dateTime(r.asOf)} · {revised ? "Restated for a Shopify refund issued Tue 24 Nov (−₹50)." : "May be revised if late refunds arrive."}</div>
        <div className="flex flex-wrap gap-3 text-[12.5px]">
          <button className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline" onClick={() => app.navigate("overview")}>Detailed breakdown <ExternalLink className="h-3 w-3" /></button>
          <button className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline" onClick={() => app.navigate("reconciliation")}>Normalization bridge <ExternalLink className="h-3 w-3" /></button>
        </div>
        <div className="border-t border-slate-100 pt-3 text-[11px] text-slate-400">Prototype preview · synthetic data</div>
      </div>
    </div>
  );
}

export function WeeklyReports() {
  const app = useApp();
  const w47 = app.week === "W47";
  const [ver, setVer] = useState<"monday" | "tuesday">(app.scenario.snapshot);
  const v1 = app.reportFor("monday");
  const v2 = app.reportFor("tuesday");
  const shown = w47 ? (ver === "monday" ? v1 : v2) : app.report;
  const [email, setEmail] = useState(app.schedule.recipient);
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const diffRows: [string, number, number][] = [
    ["Comparable sell-out", v1.comparableTotal, v2.comparableTotal],
    ["Shopify", v1.channels.shopify.normalized ?? 0, v2.channels.shopify.normalized ?? 0],
    ["Packet equivalents", v1.packets, v2.packets],
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Weekly Reports" description="The Monday email the founder receives: one trusted number, its drivers, and honest coverage. Revisions are versioned, never silently overwritten." />
      <div data-tour="report-delivery" className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <Card>
          <CardHeader title="Email preview" subtitle="Rendered from the current model and definition."
            right={w47 ? <Segmented size="sm" label="Version" value={ver} onChange={setVer} options={[{ value: "monday", label: "Monday v1" }, { value: "tuesday", label: "Revised v2" }]} /> : <Badge>Final</Badge>} />
          <div className="px-4 pb-4"><EmailPreview r={shown} /></div>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader icon={<CalendarClock className="h-4 w-4 text-slate-400" />} title="Schedule" right={<Switch label="Enable schedule" checked={app.schedule.enabled} onChange={(v) => app.set("schedule", { ...app.schedule, enabled: v })} />} />
            <div className={cn("space-y-3 px-4 pb-4 text-[12.5px]", !app.schedule.enabled && "opacity-60")}>
              <div className="grid grid-cols-3 gap-2">
                <Select label="Day" value="monday" onChange={() => {}} options={[{ value: "monday", label: "Monday" }]} />
                <Select label="Time" value={app.schedule.time} onChange={(v) => app.set("schedule", { ...app.schedule, time: v })} options={[{ value: "08:00", label: "8:00 AM" }, { value: "09:00", label: "9:00 AM" }, { value: "10:00", label: "10:00 AM" }]} />
                <Select label="Timezone" value="IST" onChange={() => {}} options={[{ value: "IST", label: "IST" }]} />
              </div>
              <div>
                <label htmlFor="recip" className="mb-1 block text-[12px] font-medium text-slate-600">Recipient email</label>
                <div className="flex gap-2">
                  <input id="recip" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={cn("h-8 flex-1 rounded-md border px-2.5 text-[13px] shadow-sm", validEmail ? "border-slate-200" : "border-red-300")} />
                  <Button disabled={!validEmail || email === app.schedule.recipient} onClick={() => { app.set("schedule", { ...app.schedule, recipient: email }); app.toast({ tone: "success", title: "Recipient saved" }); }}>Save</Button>
                </div>
                {!validEmail && <p className="mt-1 text-[11.5px] text-red-700">Enter a valid email address.</p>}
              </div>
              <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                <span>{app.schedule.enabled ? <>Next send: <b>Mon 30 Nov, {app.schedule.time === "08:00" ? "8:00" : app.schedule.time === "10:00" ? "10:00" : "9:00"} AM IST</b></> : "Schedule paused"}</span>
                <Button size="sm" variant="primary" disabled={!validEmail} onClick={() => app.toast({ tone: "info", title: "Simulated — no email was sent", body: `In production, a test of this report would go to ${email}. This prototype has no email backend.` })}><Send className="h-3.5 w-3.5" /> Send test email</Button>
              </div>
              <p className="flex items-center gap-1.5 text-[11.5px] text-slate-500"><FlaskConical className="h-3.5 w-3.5 text-violet-500" /> Scheduling is simulated and stored in this browser only.</p>
            </div>
          </Card>
          <Card>
            <CardHeader icon={<History className="h-4 w-4 text-slate-400" />} title="Report history" />
            <ul className="divide-y divide-slate-100 border-t border-slate-100 text-[12.5px]">
              {[
                { w: "W47", v: "v2", label: "16–22 Nov · revised", at: v2.asOf, total: v2.comparableTotal, status: app.revisionPublished ? "Published" : "Draft", sel: () => { app.set("week", "W47"); setVer("tuesday"); } },
                { w: "W47", v: "v1", label: "16–22 Nov · original", at: v1.asOf, total: v1.comparableTotal, status: "Published", sel: () => { app.set("week", "W47"); setVer("monday"); } },
                { w: "W46", v: "v1", label: "9–15 Nov · final", at: "2026-11-16T09:00:00+05:30", total: app.week === "W46" ? app.report.comparableTotal : app.priorReport?.comparableTotal ?? 0, status: "Published", sel: () => app.set("week", "W46") },
              ].map((h) => (
                <li key={h.w + h.v}>
                  <button onClick={h.sel} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50">
                    <span className="font-mono text-[11px] text-slate-400">{h.v}</span>
                    <span className="flex-1"><span className="font-medium">{h.label}</span><span className="block text-[11px] text-slate-500">{dateTime(h.at)}</span></span>
                    <span className="tabular font-semibold">{rupees(h.total)}</span>
                    <Badge tone={h.status === "Published" ? "green" : "amber"}>{h.status}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {w47 && (
        <Card>
          <CardHeader title="Original vs revised · 16–22 Nov" subtitle="The Monday snapshot is preserved; the revision is traceable."
            right={app.revisionPublished ? <Badge tone="green"><CheckCircle2 className="h-3 w-3" /> v2 published</Badge> : (
              <Button size="sm" variant="primary" disabled={app.readiness.blocking > 0} onClick={() => { app.set("revisionPublished", true); app.toast({ tone: "success", title: "Revision v2 marked as published", body: "Simulated — recorded in report history; no email sent." }); }}>Publish revision v2</Button>
            )} />
          <div className="overflow-x-auto px-4 pb-4">
            {app.readiness.blocking > 0 && !app.revisionPublished && (
              <Callout className="mb-3" tone="red" icon={<AlertTriangle className="h-4 w-4" />} title="Publishing is blocked" action={<Button size="sm" onClick={() => app.navigate("quality")}>Open queue</Button>}>Resolve blocking data-quality exceptions first.</Callout>
            )}
            <table className="w-full min-w-[480px] text-[12.5px]">
              <thead><tr><th className="th">Measure</th><th className="th num">Monday v1</th><th className="th num">Revised v2</th><th className="th num">Change</th></tr></thead>
              <tbody>{diffRows.map(([k, a, b]) => (
                <tr key={k}><td className="td">{k}</td><td className="td num">{k.startsWith("Packet") ? a : rupees(a)}</td><td className="td num">{k.startsWith("Packet") ? b : rupees(b)}</td>
                  <td className={cn("td num font-medium", b - a < 0 ? "text-red-700" : "text-slate-500")}>{b === a ? "—" : k.startsWith("Packet") ? b - a : rupees(b - a, { sign: true })}</td></tr>
              ))}</tbody>
            </table>
            <p className="mt-2 text-[11.5px] text-slate-500">{app.definition.refundTreatment === "adjustment_period" ? "Refund treatment is set to adjustment week, so v2 does not restate this week." : "Cause: S2 partial refund (₹50, 1 packet) issued Tue 24 Nov, restated to the original order week."}</p>
          </div>
        </Card>
      )}
    </div>
  );
}
