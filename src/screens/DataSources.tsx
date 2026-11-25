import { useState } from "react";
import { FileUp, FolderOpen, PlugZap, ArrowRight, History, FlaskConical, Database, Info } from "lucide-react";
import { useApp } from "@/state/store";
import { CHANNELS } from "@/data/channels";
import { CHANNEL_IDS, type ChannelId } from "@/data/types";
import { Badge, Button, Callout, Card, PageHeader } from "@/components/ui";
import { ChannelMark, EvidenceBadge, FolderStatusBadge, UploadDialog, useFolderStatus } from "@/components/shared";
import { dateTime } from "@/lib/format";

function SourceCard({ id, onUpload }: { id: ChannelId; onUpload: (c: ChannelId, folder?: string) => void }) {
  const app = useApp();
  const meta = CHANNELS[id];
  const ch = app.report.channels[id];
  const folderStatus = useFolderStatus();
  const received = ch.lines.filter((l) => l.status !== "source_unavailable" && l.status !== "not_in_snapshot").length;
  const dupes = ch.lines.filter((l) => l.status === "duplicate").length;
  const folders = meta.folders.map((f) => ({ f, s: folderStatus(f) }));
  const missing = folders.filter((x) => x.s === "missing").length;
  const lastUpload = app.uploads.find((u) => meta.folders.some((f) => f.id === u.folderId));

  let status: React.ReactNode;
  if (meta.kind === "connector") status = <Badge tone="green" dot>Connected · simulated</Badge>;
  else if (missing) status = <Badge tone="red" dot>{missing} file{missing > 1 ? "s" : ""} missing</Badge>;
  else status = <Badge tone="green" dot>Files received</Badge>;

  return (
    <Card className="flex flex-col">
      <div className="flex items-start gap-3 px-4 pt-4">
        <ChannelMark id={id} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[14px] font-semibold">{meta.name}</h3>
            {status}
          </div>
          <div className="mt-0.5 text-[12px] text-slate-500">
            {meta.kind === "connector" ? <PlugZap className="mr-1 inline h-3.5 w-3.5" /> : <FolderOpen className="mr-1 inline h-3.5 w-3.5" />}
            {meta.method} · {meta.methodDetail}
          </div>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 px-4 text-[12px]">
        <div><dt className="text-slate-500">{meta.kind === "connector" ? "Last sync" : "Last upload"}</dt><dd className="font-medium">{lastUpload ? dateTime(lastUpload.at) : dateTime(meta.lastSync)}</dd></div>
        <div><dt className="text-slate-500">Reporting period</dt><dd className="font-medium">{app.report.weekLabel}</dd></div>
        <div><dt className="text-slate-500">Records received</dt><dd className="font-medium tabular">{received}{dupes ? <span className="text-red-700"> · {dupes} duplicate</span> : ""}</dd></div>
        <div><dt className="text-slate-500">Source coverage</dt><dd>{ch.status === "comparable" ? <span className="font-medium text-emerald-700">Comparable</span> : <span className="font-medium text-amber-700">Excluded · not zero</span>}</dd></div>
        <div className="col-span-2"><dt className="text-slate-500">Data granularity</dt><dd className="font-medium">{meta.granularity}</dd></div>
        <div className="col-span-2"><dt className="text-slate-500">Commercial model</dt><dd className="font-medium">{meta.commercialModelLabel}</dd></div>
      </dl>
      <div className="mt-3 border-t border-slate-100 px-4 pt-3">
        <div className="label mb-1.5">Capabilities</div>
        <ul className="space-y-1">
          {meta.capabilities.map((c) => (
            <li key={c.label} className="flex items-start justify-between gap-2 text-[12px]">
              <span className="text-slate-700">{c.label}</span>
              <EvidenceBadge e={c.evidence} />
            </li>
          ))}
        </ul>
      </div>
      {meta.folders.length > 0 && (
        <div className="mt-3 border-t border-slate-100 px-4 pt-3">
          <div className="label mb-1.5">Folders · {app.report.weekLabel}</div>
          <ul className="space-y-1.5">
            {folders.map(({ f, s }) => (
              <li key={f.id} className="flex items-center gap-2 text-[12px]">
                <FolderOpen className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1 truncate" title={f.path}>{f.reportType}</span>
                <FolderStatusBadge s={s} />
                {s === "missing" && app.week === "W47" && (
                  <button className="text-[11.5px] font-medium text-brand-700 hover:underline" onClick={() => onUpload(id, f.id)}>Upload</button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-auto flex flex-wrap gap-2 px-4 pb-4 pt-4">
        <Button size="sm" variant="secondary" onClick={() => app.openChannel(id)}>View source details <ArrowRight className="h-3.5 w-3.5" /></Button>
        {meta.kind === "files" && app.week === "W47" && (
          <Button size="sm" variant="subtle" onClick={() => onUpload(id)}><FileUp className="h-3.5 w-3.5" /> Upload / demo file</Button>
        )}
      </div>
    </Card>
  );
}

export function DataSources() {
  const app = useApp();
  const [upload, setUpload] = useState<{ c: ChannelId; f?: string } | null>(null);
  return (
    <div>
      <PageHeader
        title="Data Sources"
        description="Extraction and comparability are separate problems. Hevo's existing connectors cover Shopify and Amazon; quick-commerce portal exports land in dedicated per-channel, per-report folders. No scraping, no live credentials."
        right={<Badge tone="violet" className="py-1"><FlaskConical className="h-3 w-3" /> Simulated connections · synthetic records</Badge>}
      />

      <div className="mb-4 grid gap-2 rounded-lg border border-slate-200 bg-white p-3 text-[12px] text-slate-600 shadow-card sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center">
        <div className="flex items-center gap-2"><PlugZap className="h-4 w-4 text-brand-600" /><span><b className="text-slate-800">Existing connectors</b> · Shopify, Amazon</span></div>
        <ArrowRight className="hidden h-4 w-4 text-slate-300 sm:block" />
        <div className="flex items-center gap-2"><FolderOpen className="h-4 w-4 text-amber-600" /><span><b className="text-slate-800">File folders</b> · Blinkit, Zepto, Instamart</span></div>
        <ArrowRight className="hidden h-4 w-4 text-slate-300 sm:block" />
        <div className="flex items-center gap-2"><Database className="h-4 w-4 text-emerald-600" /><span><b className="text-slate-800">Canonical sales model</b> · one schema</span></div>
      </div>

      <div data-tour="source-cards" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {CHANNEL_IDS.map((c) => (
          <SourceCard key={c} id={c} onUpload={(ch, f) => setUpload({ c: ch, f })} />
        ))}
        <Card className="flex flex-col justify-center gap-2 border-dashed bg-slate-50/50 p-4 text-[12.5px] text-slate-600 shadow-none">
          <div className="flex items-center gap-2 font-semibold text-slate-800"><Info className="h-4 w-4 text-slate-400" /> How to read evidence labels</div>
          <div className="flex flex-wrap items-center gap-1.5"><EvidenceBadge e="established" /> works today via a Hevo connector or confirmed onboarding</div>
          <div className="flex flex-wrap items-center gap-1.5"><EvidenceBadge e="documented" /> described publicly by the platform</div>
          <div className="flex flex-wrap items-center gap-1.5"><EvidenceBadge e="conditional" /> depends on export availability or agreement</div>
          <div className="flex flex-wrap items-center gap-1.5"><EvidenceBadge e="unverified" /> assumption to validate with the brand</div>
        </Card>
      </div>

      <Card className="mt-5">
        <div className="flex items-center gap-2 px-4 pt-3.5 pb-2 text-[13.5px] font-semibold"><History className="h-4 w-4 text-slate-400" /> Upload activity</div>
        {app.uploads.length === 0 ? (
          <p className="px-4 pb-4 text-[12.5px] text-slate-500">No files added in this session yet. Use <b>Upload / demo file</b> on a quick-commerce card.</p>
        ) : (
          <div className="overflow-x-auto px-1 pb-2">
            <table className="w-full text-[12px]">
              <thead><tr><th className="th">File</th><th className="th">Folder</th><th className="th num">Rows</th><th className="th">Origin</th><th className="th">Accepted</th></tr></thead>
              <tbody>
                {app.uploads.map((u, i) => {
                  const folder = CHANNEL_IDS.flatMap((c) => CHANNELS[c].folders).find((f) => f.id === u.folderId);
                  return (
                    <tr key={i}>
                      <td className="td font-mono">{u.fileName}</td>
                      <td className="td font-mono text-slate-500">{folder?.path}</td>
                      <td className="td num">{u.rows}</td>
                      <td className="td"><Badge tone={u.origin === "demo" ? "violet" : "slate"}>{u.origin === "demo" ? "Demo file" : "Your file · preview only"}</Badge></td>
                      <td className="td">{dateTime(u.at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {app.week === "W46" && (
        <Callout className="mt-4" tone="slate" title="Viewing a finalised week">Uploads are only accepted for the open reporting week (16–22 Nov).</Callout>
      )}

      {upload && <UploadDialog open onClose={() => setUpload(null)} channel={upload.c} initialFolder={upload.f} />}
    </div>
  );
}
