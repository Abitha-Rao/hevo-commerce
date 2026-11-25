import { useRef, useState } from "react";
import { FileUp, FolderOpen, CheckCircle2, XCircle, FileSpreadsheet, AlertTriangle, Database, ArrowRight, Ban } from "lucide-react";
import type { ChannelId } from "@/data/types";
import { CHANNELS, EVIDENCE_LABEL, type Evidence, type FolderSpec } from "@/data/channels";
import { useApp } from "@/state/store";
import { Badge, Button, Callout, Modal, SidePanel, type Tone } from "@/components/ui";
import { validateCsv, type CsvValidation } from "@/lib/csv";
import { DEMO_FILES } from "@/lib/demoFiles";
import { dateTime, num, rupees } from "@/lib/format";
import { productName } from "@/data/catalog";
import { cn } from "@/lib/cn";
import type { LineStatus } from "@/lib/engine";

export function ChannelMark({ id, size = "md" }: { id: ChannelId; size?: "sm" | "md" | "lg" }) {
  const c = CHANNELS[id];
  const s = size === "sm" ? "h-5 w-5 text-[10px]" : size === "lg" ? "h-9 w-9 text-[13px]" : "h-7 w-7 text-[11px]";
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-md font-bold text-white", s)} style={{ background: c.color }} aria-hidden>
      {c.short.slice(0, 2)}
    </span>
  );
}

export const EVIDENCE_TONE: Record<Evidence, Tone> = { established: "green", documented: "sky", conditional: "amber", unverified: "slate" };
export function EvidenceBadge({ e }: { e: Evidence }) {
  return <Badge tone={EVIDENCE_TONE[e]}>{EVIDENCE_LABEL[e]}</Badge>;
}

export type FolderStatus = "received" | "missing" | "not_available" | "excluded";

export function useFolderStatus() {
  const app = useApp();
  return (f: FolderSpec): FolderStatus => {
    if (app.week === "W46") return f.availability === "never" ? "not_available" : f.availability === "instamart_returns" ? "missing" : "received";
    switch (f.availability) {
      case "always": return "received";
      case "never": return "not_available";
      case "blinkit_sellout":
        return app.scenario.blinkitSellOut ? "received" : app.resolutions["missing-blinkit-sellout"]?.status === "excluded" ? "excluded" : "missing";
      case "instamart_order_date":
        return app.scenario.instamartOrderDate ? "received" : app.resolutions["granularity-instamart-orderdate"]?.status === "excluded" ? "excluded" : "missing";
      case "instamart_returns":
        return app.instamartReturnsReceived ? "received" : "missing";
    }
  };
}

export function FolderStatusBadge({ s }: { s: FolderStatus }) {
  if (s === "received") return <Badge tone="green" dot>Received</Badge>;
  if (s === "missing") return <Badge tone="red" dot>Missing</Badge>;
  if (s === "excluded") return <Badge tone="amber" dot>Excluded</Badge>;
  return <Badge tone="slate" dot>Not available</Badge>;
}

const STATUS_LABEL: Record<LineStatus, { label: string; tone: Tone }> = {
  included: { label: "Included", tone: "green" },
  cancelled: { label: "Cancelled", tone: "slate" },
  sell_in: { label: "Sell-in (separate)", tone: "sky" },
  duplicate: { label: "Duplicate · held", tone: "red" },
  not_in_snapshot: { label: "After snapshot", tone: "slate" },
  source_unavailable: { label: "Excluded · not zero", tone: "amber" },
  adjustment_period: { label: "Next week", tone: "slate" },
};
export function LineStatusBadge({ s }: { s: LineStatus }) {
  return <Badge tone={STATUS_LABEL[s].tone}>{STATUS_LABEL[s].label}</Badge>;
}

/* ------------------------------------------------------------------ */
/* Upload dialog                                                      */
/* ------------------------------------------------------------------ */

export function useApplyUpload() {
  const app = useApp();
  return (folderId: string, fileName: string, rows: number, origin: "demo" | "user") => {
    app.logUpload({ folderId, fileName, rows, origin });
    if (folderId === "blinkit-sellout") {
      app.setScenario({ blinkitSellOut: true });
      app.reopen("missing-blinkit-sellout");
    }
    if (folderId === "instamart-orderdate") {
      app.setScenario({ instamartOrderDate: true });
      app.reopen("granularity-instamart-orderdate");
    }
    if (folderId === "instamart-returns") app.set("instamartReturnsReceived", true);
  };
}

export function UploadDialog({ open, onClose, channel, initialFolder }: { open: boolean; onClose: () => void; channel: ChannelId; initialFolder?: string }) {
  const app = useApp();
  const meta = CHANNELS[channel];
  const folders = meta.folders.filter((f) => f.availability !== "never");
  const [folderId, setFolderId] = useState(initialFolder ?? folders[0]?.id);
  const [file, setFile] = useState<{ name: string; origin: "demo" | "user"; v: CsvValidation } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const apply = useApplyUpload();
  const folder = folders.find((f) => f.id === folderId) ?? folders[0];

  const reset = () => setFile(null);
  const close = () => { reset(); onClose(); };

  const readFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => setFile({ name: f.name, origin: "user", v: validateCsv(String(reader.result ?? ""), folder.expectedColumns) });
    reader.readAsText(f);
  };
  const loadDemo = () => {
    const d = DEMO_FILES[folder.id];
    setFile({ name: d.name, origin: "demo", v: validateCsv(d.content, folder.expectedColumns) });
  };
  const accept = () => {
    if (!file) return;
    apply(folder.id, file.name, file.v.rows.length, file.origin);
    app.toast({
      tone: "success",
      title: `${file.name} accepted into ${folder.path}`,
      body: file.v.rows.length === 0 ? "0 data rows — recorded as a confirmed empty report, not as missing." : file.origin === "user" ? "Columns validated. Totals keep using the matching synthetic records so the demo stays deterministic." : `${file.v.rows.length} synthetic row${file.v.rows.length === 1 ? "" : "s"} validated.`,
    });
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={`Add a ${meta.short} report file`}
      footer={
        <>
          <Button variant="secondary" onClick={close}>Cancel</Button>
          <Button variant="primary" onClick={accept} disabled={!file || !file.v.ok}>
            <CheckCircle2 className="h-4 w-4" /> Accept file
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <div className="label mb-1.5">Destination folder</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {folders.map((f) => (
              <button
                key={f.id}
                onClick={() => { setFolderId(f.id); reset(); }}
                className={cn("flex items-start gap-2 rounded-md border px-3 py-2 text-left", f.id === folder.id ? "border-brand-500 bg-brand-50/60 ring-1 ring-brand-500" : "border-slate-200 hover:border-slate-300")}
                aria-pressed={f.id === folder.id}
              >
                <FolderOpen className="mt-0.5 h-4 w-4 text-slate-400" />
                <div className="min-w-0">
                  <div className="text-[13px] font-medium">{f.reportType}</div>
                  <div className="truncate font-mono text-[11px] text-slate-500">{f.path}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="label mb-1.5">Expected columns</div>
          <div className="flex flex-wrap gap-1">
            {folder.expectedColumns.map((c) => (
              <code key={c} className={cn("rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px]", file?.v.missing.includes(c) && "bg-red-50 text-red-700 ring-1 ring-red-200")}>{c}</code>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-4">
          <FileUp className="h-5 w-5 text-slate-400" />
          <div className="flex-1 text-[12.5px] text-slate-600">Choose a CSV from your computer, or load the synthetic demo file for this folder.</div>
          <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
          <Button variant="secondary" onClick={() => inputRef.current?.click()}><FileSpreadsheet className="h-4 w-4" /> Choose CSV</Button>
          <Button variant="subtle" onClick={loadDemo}><Database className="h-4 w-4" /> Load demo file</Button>
        </div>
        {file && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[12px] text-slate-700">{file.name}</span>
              {file.origin === "demo" && <Badge tone="violet">Synthetic demo file</Badge>}
              {file.v.ok ? <Badge tone="green"><CheckCircle2 className="h-3 w-3" /> Columns valid</Badge> : <Badge tone="red"><XCircle className="h-3 w-3" /> Validation failed</Badge>}
              <span className="text-[12px] text-slate-500">{file.v.rows.length} data row{file.v.rows.length === 1 ? "" : "s"}</span>
            </div>
            {file.v.errors.length > 0 && (
              <Callout tone="red" icon={<AlertTriangle className="h-4 w-4" />} title="This file can't be accepted">
                <ul className="list-disc pl-4">{file.v.errors.map((e) => <li key={e}>{e}</li>)}</ul>
              </Callout>
            )}
            {file.v.extra.length > 0 && <p className="text-[12px] text-slate-500">Ignored extra columns: {file.v.extra.join(", ")}</p>}
            {file.v.rows.length === 0 && file.v.ok && (
              <Callout tone="indigo" title="Empty but valid report">The file has headers and no rows. It will be recorded as a confirmed zero for this period — different from a missing file.</Callout>
            )}
            {file.v.header.length > 0 && file.v.rows.length > 0 && (
              <div className="overflow-x-auto rounded-md border border-slate-200">
                <table className="w-full text-[12px]">
                  <thead><tr>{file.v.header.map((h) => <th key={h} className="th font-mono normal-case">{h}</th>)}</tr></thead>
                  <tbody>{file.v.rows.slice(0, 8).map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="td font-mono text-[11.5px]">{c}</td>)}</tr>)}</tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Channel detail side panel                                          */
/* ------------------------------------------------------------------ */

export function ChannelPanel() {
  const app = useApp();
  const id = app.channelPanel;
  const folderStatus = useFolderStatus();
  const [upload, setUpload] = useState<string | null>(null);
  if (!id) return null;
  const meta = CHANNELS[id];
  const ch = app.report.channels[id];
  const prior = app.priorReport?.channels[id];
  const contrib = app.growth.contributions.find((c) => c.channel === id);
  return (
    <>
      <SidePanel
        open={!!id}
        onClose={() => app.openChannel(null)}
        title={<span className="flex items-center gap-2"><ChannelMark id={id} size="sm" /> {meta.name}</span>}
        subtitle={`${meta.method} · ${meta.methodDetail} · ${app.report.weekLabel} · ${app.report.versionLabel}`}
      >
        <div className="space-y-5">
          {ch.status === "excluded" && (
            <Callout tone="amber" icon={<Ban className="h-4 w-4" />} title="Excluded from the comparable total — not zero">{ch.excludedReason}</Callout>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Raw report", rupees(ch.raw), ch.rawBasis],
              ["Comparable sell-out", ch.normalized === null ? "Excluded" : rupees(ch.normalized), "After normalization"],
              ["Packets", ch.packets === null ? "—" : num(ch.packets) + (ch.unmappedUnits ? "*" : ""), ch.unmappedUnits ? `*${ch.unmappedUnits} unit unmapped` : "Packet equivalents"],
              ["WoW change", contrib?.delta === null || contrib?.delta === undefined ? "n/a" : rupees(contrib.delta, { sign: true }), prior?.normalized != null ? `Prior week ${rupees(prior.normalized)}` : "No comparable prior"],
            ].map(([k, v, s]) => (
              <div key={k} className="rounded-lg border border-slate-200 p-3">
                <div className="label">{k}</div>
                <div className="mt-1 text-lg font-semibold tabular">{v}</div>
                <div className="mt-0.5 text-[11px] leading-tight text-slate-500">{s}</div>
              </div>
            ))}
          </div>
          {ch.sellIn > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-sky-50 px-3 py-2 text-[12.5px] text-sky-900 ring-1 ring-sky-200">
              <span>Wholesale sell-in (separate measure)</span>
              <span className="font-semibold tabular">{rupees(ch.sellIn)} · {ch.sellInPackets} packets</span>
            </div>
          )}

          <section>
            <h3 className="mb-2 text-[13px] font-semibold">Source records → canonical rows</h3>
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="w-full text-[12px]">
                <thead>
                  <tr><th className="th">Ref</th><th className="th">SKU → product</th><th className="th num">Units</th><th className="th num">Normalized</th><th className="th">Treatment</th></tr>
                </thead>
                <tbody>
                  {ch.lines.map((l, i) => (
                    <tr key={i}>
                      <td className="td font-mono font-semibold">{l.record.ref}</td>
                      <td className="td"><div className="font-mono text-[11px]">{l.record.sourceSku}</div><div className="text-[11px] text-slate-500">{productName(l.canonicalProductId)}{l.packetMultiplier ? ` × ${l.packetMultiplier}` : ""}</div></td>
                      <td className="td num">{l.record.transactionType === "refund" ? `−${l.record.refundUnits}` : l.record.sellingUnits}</td>
                      <td className="td num font-medium">{l.status === "included" ? rupees(l.normalizedSales) : l.status === "sell_in" ? <span className="text-sky-700">{rupees(l.record.grossMerchandiseValue)}</span> : "—"}</td>
                      <td className="td"><LineStatusBadge s={l.status} /><div className="mt-1 text-[11px] leading-tight text-slate-500">{l.treatment}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-[13px] font-semibold">Capabilities and evidence</h3>
            <ul className="space-y-1.5">
              {meta.capabilities.map((c) => (
                <li key={c.label} className="flex items-start justify-between gap-3 text-[12.5px]">
                  <span>{c.label}{c.note && <span className="block text-[11px] text-slate-500">{c.note}</span>}</span>
                  <EvidenceBadge e={c.evidence} />
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="mb-2 text-[13px] font-semibold">Ingestion</h3>
            {meta.kind === "connector" ? (
              <div className="rounded-md border border-slate-200 p-3 text-[12.5px] text-slate-600">
                <div className="flex items-center gap-2"><Badge tone="indigo">Simulated connection</Badge> Hevo {meta.name} connector · last sync {dateTime(meta.lastSync)}</div>
                <p className="mt-1.5 text-[12px] text-slate-500">In production this would reuse the existing Hevo pipeline. This prototype reads synthetic records only.</p>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {meta.folders.map((f) => {
                  const s = folderStatus(f);
                  return (
                    <li key={f.id} className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 px-3 py-2">
                      <FolderOpen className="h-4 w-4 text-slate-400" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] font-medium">{f.reportType}</div>
                        <div className="truncate font-mono text-[11px] text-slate-500">{f.path}</div>
                        {f.unavailableReason && <div className="text-[11px] text-slate-500">{f.unavailableReason}</div>}
                      </div>
                      <FolderStatusBadge s={s} />
                      {f.availability !== "never" && app.week === "W47" && (
                        <Button size="sm" variant={s === "missing" ? "primary" : "secondary"} onClick={() => setUpload(f.id)}>
                          <FileUp className="h-3.5 w-3.5" /> {s === "missing" ? "Upload" : "Replace"}
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          <div className="flex justify-end">
            <Button variant="ghost" onClick={() => { app.openChannel(null); app.navigate("reconciliation"); }}>
              See it in the Normalization Bridge <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SidePanel>
      {upload && <UploadDialog open onClose={() => setUpload(null)} channel={id} initialFolder={upload} />}
    </>
  );
}
