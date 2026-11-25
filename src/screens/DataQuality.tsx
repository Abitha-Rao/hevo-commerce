import { useState } from "react";
import { AlertOctagon, AlertTriangle, Info, CheckCircle2, FileUp, Trash2, Ban, Eye, Link2, Undo2, ShieldCheck, Boxes } from "lucide-react";
import { useApp } from "@/state/store";
import { Badge, Button, Callout, Card, CardHeader, PageHeader, Segmented, Select, type Tone } from "@/components/ui";
import { ChannelMark, FolderStatusBadge, useApplyUpload, useFolderStatus, type FolderStatus } from "@/components/shared";
import { ReadinessBadge } from "@/components/layout/Shell";
import { CHANNELS } from "@/data/channels";
import { CHANNEL_IDS } from "@/data/types";
import { PRODUCTS, productName } from "@/data/catalog";
import { DEMO_FILES } from "@/lib/demoFiles";
import { validateCsv } from "@/lib/csv";
import { TYPE_LABEL, type DQException, type Severity } from "@/lib/quality";
import { rupees } from "@/lib/format";
import { cn } from "@/lib/cn";

const SEV: Record<Severity, { tone: Tone; label: string; Icon: typeof Info }> = {
  blocking: { tone: "red", label: "Blocking", Icon: AlertOctagon },
  warning: { tone: "amber", label: "Warning", Icon: AlertTriangle },
  info: { tone: "slate", label: "Info", Icon: Info },
};

function ExpectedReceived() {
  const app = useApp();
  const fs = useFolderStatus();
  const rows: { c: (typeof CHANNEL_IDS)[number]; report: string; s: FolderStatus; rows: string }[] = [];
  for (const c of CHANNEL_IDS) {
    const meta = CHANNELS[c];
    const ch = app.report.channels[c];
    if (meta.kind === "connector") {
      const n = ch.lines.filter((l) => l.record.transactionType === "order_line" && l.status !== "duplicate").length;
      rows.push({ c, report: "Orders (connector)", s: "received", rows: `${n} order lines` });
      if (c === "shopify") rows.push({ c, report: "Refunds & cancellations (connector)", s: "received", rows: `${ch.lines.filter((l) => l.record.transactionType === "refund" && l.status !== "not_in_snapshot").length} refunds` });
      if (c === "amazon") rows.push({ c, report: "Orders re-download (overlap)", s: "received", rows: `${ch.lines.filter((l) => l.status === "duplicate").length} duplicate held` });
    } else {
      for (const f of meta.folders) {
        const s = fs(f);
        const recs = ch.lines.filter((l) => l.record.sourceFile.includes(f.path.replace("/commerce/", "")) && l.status !== "source_unavailable").length;
        rows.push({ c, report: f.reportType, s, rows: s === "received" ? (f.id === "instamart-returns" ? "0 rows · confirmed zero" : f.id === "instamart-delivery" ? "0 rows in window" : `${recs} rows`) : s === "not_available" ? f.unavailableReason ?? "—" : s === "excluded" ? "Excluded by analyst" : "Not received — unknown, not zero" });
      }
    }
  }
  const received = rows.filter((r) => r.s === "received").length;
  const expected = rows.filter((r) => r.s !== "not_available").length;
  return (
    <Card>
      <CardHeader title="Expected vs received" subtitle={`${app.report.weekLabel} · ${received} of ${expected} expected source-period datasets received`} right={<Badge tone={received === expected ? "green" : "amber"}>{Math.round((received / expected) * 100)}% received</Badge>} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-[12.5px]">
          <thead><tr><th className="th">Source</th><th className="th">Report</th><th className="th">Status</th><th className="th">Contents</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="td"><span className="flex items-center gap-2"><ChannelMark id={r.c} size="sm" />{CHANNELS[r.c].short}</span></td>
                <td className="td">{r.report}</td>
                <td className="td"><FolderStatusBadge s={r.s} /></td>
                <td className={cn("td text-[12px]", r.s === "missing" ? "text-red-700" : "text-slate-500")}>{r.rows}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function MapInline({ e, onDone }: { e: DQException; onDone: () => void }) {
  const app = useApp();
  const m = app.mappings.find((x) => x.channel === e.source && x.sourceSku === e.sku)!;
  const [pid, setPid] = useState("CC-MSL-40G");
  const [mult, setMult] = useState(/PACK6/.test(m.sourceSku) ? 6 : 1);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-brand-200 bg-brand-50/50 p-2">
      <span className="font-mono text-[11.5px]">{m.sourceSku}</span><span className="text-slate-400">→</span>
      <Select label="Canonical product" value={pid} onChange={setPid} options={PRODUCTS.map((p) => ({ value: p.id, label: p.name }))} className="h-7 text-[12px]" />
      <span className="text-slate-400">×</span>
      <input aria-label="Pack multiplier" type="number" min={1} max={48} value={mult} onChange={(ev) => setMult(Math.max(1, Math.min(48, Number(ev.target.value) || 1)))} className="h-7 w-14 rounded-md border border-slate-200 px-2 text-[12px]" />
      <Button size="sm" variant="primary" onClick={() => {
        app.updateMapping({ ...m, canonicalProductId: pid, packetMultiplier: mult });
        app.toast({ tone: "success", title: `${m.sourceSku} → ${productName(pid)} × ${mult}`, body: "Packet equivalents recalculated." });
        onDone();
      }}>Apply mapping</Button>
    </div>
  );
}

function ExceptionRow({ e }: { e: DQException }) {
  const app = useApp();
  const apply = useApplyUpload();
  const [mapping, setMapping] = useState(false);
  const sev = SEV[e.severity];
  const open = e.status === "open";

  const upload = (folderId: string) => {
    const d = DEMO_FILES[folderId];
    const v = validateCsv(d.content, CHANNELS[e.source].folders.find((f) => f.id === folderId)!.expectedColumns);
    apply(folderId, d.name, v.rows.length, "demo");
    app.toast({ tone: "success", title: `Sample report loaded: ${d.name}`, body: v.rows.length ? `${v.rows.length} synthetic rows validated and added to the model.` : "0 data rows — recorded as confirmed zero, not missing." });
  };

  const actionBtn = (a: DQException["actions"][number]) => {
    switch (a) {
      case "upload_blinkit_sellout": return <Button key={a} size="sm" variant="primary" onClick={() => upload("blinkit-sellout")}><FileUp className="h-3.5 w-3.5" /> Upload sample report</Button>;
      case "upload_instamart_orderdate": return <Button key={a} size="sm" variant="primary" onClick={() => upload("instamart-orderdate")}><FileUp className="h-3.5 w-3.5" /> Upload order-date report</Button>;
      case "upload_instamart_returns": return <Button key={a} size="sm" variant="primary" onClick={() => upload("instamart-returns")}><FileUp className="h-3.5 w-3.5" /> Upload sample report</Button>;
      case "exclude_source": return <Button key={a} size="sm" variant="secondary" onClick={() => { app.resolve(e.id, { status: "excluded", note: `${CHANNELS[e.source].short} excluded from the comparable total and disclosed in the report.` }); app.toast({ tone: "info", title: `${CHANNELS[e.source].short} excluded from comparable total`, body: "Coverage is reduced and disclosed. Excluded data is never shown as ₹0 sales." }); }}><Ban className="h-3.5 w-3.5" /> Exclude from comparable total</Button>;
      case "remove_duplicate": return <Button key={a} size="sm" variant="primary" onClick={() => { app.resolve(e.id, { status: "resolved", note: "Duplicate copy removed from the normalized model; original row kept." }); app.toast({ tone: "success", title: "Duplicate removed from the normalized model", body: "The original A2 row is kept. Totals were never inflated." }); }}><Trash2 className="h-3.5 w-3.5" /> Remove duplicate</Button>;
      case "map_sku": return <Button key={a} size="sm" variant="primary" onClick={() => setMapping((v) => !v)}><Boxes className="h-3.5 w-3.5" /> Resolve mapping</Button>;
      case "acknowledge": return <Button key={a} size="sm" variant="secondary" onClick={() => app.resolve(e.id, { status: "acknowledged", note: e.type === "late_adjustment" ? "Revision reviewed." : "Acknowledged — disclosed as unavailable city data." })}><Eye className="h-3.5 w-3.5" /> {e.type === "unsupported_granularity" || e.type === "missing_field" ? "Acknowledge unavailable city data" : "Acknowledge"}</Button>;
      case "view_revision": return <Button key={a} size="sm" variant="ghost" onClick={() => app.navigate("reports")}><Link2 className="h-3.5 w-3.5" /> View revision</Button>;
    }
  };

  return (
    <li className={cn("grid gap-3 px-4 py-3.5 md:grid-cols-[110px_1fr_220px]", !open && "bg-slate-50/50")}>
      <div className="flex flex-row flex-wrap items-start gap-1.5 md:flex-col">
        <Badge tone={open ? sev.tone : "slate"}><sev.Icon className="h-3 w-3" /> {sev.label}</Badge>
        <span className="flex items-center gap-1.5 text-[12px] text-slate-600"><ChannelMark id={e.source} size="sm" />{CHANNELS[e.source].short}</span>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("text-[13px] font-semibold", !open && "text-slate-500")}>{e.title}</span>
          <Badge tone="slate">{TYPE_LABEL[e.type]}</Badge>
        </div>
        <p className="mt-0.5 text-[12.5px] text-slate-600">{e.description}</p>
        <p className="mt-1 text-[12px] text-slate-700"><span className="font-semibold">Impact on report: </span>{e.impact}</p>
        {e.resolutionNote && !open && <p className="mt-1 flex items-center gap-1.5 text-[12px] text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> {e.resolutionNote}</p>}
        {open && <div className="mt-2 flex flex-wrap gap-2">{e.actions.map(actionBtn)}</div>}
        {open && mapping && <MapInline e={e} onDone={() => setMapping(false)} />}
      </div>
      <div className="flex flex-row flex-wrap items-start justify-between gap-2 text-[12px] md:flex-col md:items-end">
        <span className="text-slate-500">Owner: <span className="font-medium text-slate-700">{e.owner}</span></span>
        <Badge tone={open ? (e.severity === "blocking" ? "red" : e.severity === "warning" ? "amber" : "slate") : e.status === "excluded" ? "amber" : "green"} dot>
          {open ? "Open" : e.status === "resolved" ? "Resolved" : e.status === "excluded" ? "Excluded" : "Acknowledged"}
        </Badge>
        {!open && e.id !== "missing-instamart-returns" && e.type !== "unmapped_sku" && (
          <button className="inline-flex items-center gap-1 text-[11.5px] text-slate-500 hover:text-slate-800" onClick={() => app.reopen(e.id)}><Undo2 className="h-3 w-3" /> Reopen</button>
        )}
      </div>
    </li>
  );
}

export function DataQuality() {
  const app = useApp();
  const [filter, setFilter] = useState<"open" | "all">("all");
  const list = app.exceptions.filter((e) => filter === "all" || e.status === "open");
  const rank = { blocking: 0, warning: 1, info: 2 } as const;
  const sorted = [...list].sort((a, b) => Number(a.status !== "open") - Number(b.status !== "open") || rank[a.severity] - rank[b.severity]);
  const r = app.report;

  return (
    <div className="space-y-5">
      <PageHeader title="Data Quality" description="Deterministic validation before anything is published. Missing data is never zero sales; duplicates and unmapped products are caught, not guessed." />
      {app.week === "W46" ? (
        <Callout tone="green" icon={<ShieldCheck className="h-4 w-4" />} title="Week 46 is finalised">All exceptions for 9–15 Nov were resolved before publishing. Switch to Week 47 to work the open queue.</Callout>
      ) : (
        <div className="grid gap-3 md:grid-cols-4">
          <Card className="p-4 md:col-span-2">
            <div className="label">Report readiness · next publish</div>
            <div className="mt-2 flex flex-wrap items-center gap-3"><ReadinessBadge /><span className="text-[12.5px] text-slate-600">
              {app.readiness.blocking ? `${app.readiness.blocking} blocking exception${app.readiness.blocking > 1 ? "s" : ""} must be resolved.` : app.readiness.warnings ? `${app.readiness.warnings} warning${app.readiness.warnings > 1 ? "s" : ""} will be disclosed in the report.` : "No open exceptions. Disclosures are recorded."}
            </span></div>
            <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-slate-100">
              {(() => {
                const t = app.exceptions.length || 1;
                const done = app.exceptions.filter((e) => e.status !== "open").length;
                return <div className="bg-emerald-500 transition-all" style={{ width: `${(done / t) * 100}%` }} />;
              })()}
            </div>
            <div className="mt-1 text-[11.5px] text-slate-500">{app.exceptions.filter((e) => e.status !== "open").length} of {app.exceptions.length} exceptions closed</div>
          </Card>
          <Card className="p-4">
            <div className="label">Comparable total now</div>
            <div className="mt-1 text-xl font-semibold tabular">{rupees(r.comparableTotal)}</div>
            <div className="text-[11.5px] text-slate-500">{r.comparableChannels.length}/5 channels · {r.version}</div>
          </Card>
          <Card className="p-4">
            <div className="label">Packet equivalents</div>
            <div className="mt-1 text-xl font-semibold tabular">{r.packets}</div>
            <div className={cn("text-[11.5px]", r.unmappedUnits ? "text-amber-700" : "text-slate-500")}>{r.unmappedUnits ? `${r.unmappedUnits} unit unmapped` : "Complete"}</div>
          </Card>
        </div>
      )}

      <Card data-tour="exception-queue">
        <CardHeader title="Exception queue" subtitle="Every exception states its impact on the report. Readiness updates after each action."
          right={<Segmented size="sm" label="Filter exceptions" value={filter} onChange={setFilter} options={[{ value: "all", label: `All (${app.exceptions.length})` }, { value: "open", label: `Open (${app.readiness.open})` }]} />} />
        {sorted.length === 0 ? (
          <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-6 text-[12.5px] text-slate-500"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> {app.week === "W46" ? "No exceptions for this week." : "No open exceptions."}</div>
        ) : (
          <ul className="divide-y divide-slate-100 border-t border-slate-100">{sorted.map((e) => <ExceptionRow key={e.id} e={e} />)}</ul>
        )}
        {app.week === "W47" && (
          <div className="border-t border-slate-100 px-4 py-2.5 text-[11.5px] text-slate-500">
            Tip: in Reconciliation, switch <b>Blinkit sell-out</b> or <b>Instamart order date</b> to unavailable to generate blocking missing-data exceptions here.
          </div>
        )}
      </Card>

      <ExpectedReceived />
    </div>
  );
}
