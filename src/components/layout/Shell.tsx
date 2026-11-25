import { useState, type ReactNode } from "react";
import {
  LayoutDashboard, Plug, Sigma, ShieldCheck, GitCompareArrows, Mail, Settings, LifeBuoy, RotateCcw, Compass, Menu, X,
  CheckCircle2, AlertTriangle, XCircle, Clock, FlaskConical, Info,
} from "lucide-react";
import { useApp, type Route } from "@/state/store";
import { useTour } from "@/components/tour/Tour";
import { Badge, Button, Select } from "@/components/ui";
import { cn } from "@/lib/cn";
import { dateTime } from "@/lib/format";
import { WEEKS } from "@/lib/adapters";
import { READINESS_LABEL } from "@/lib/quality";
import type { WeekId } from "@/data/types";

const NAV: { id: Route; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "sources", label: "Data Sources", icon: Plug },
  { id: "model", label: "Sales Model", icon: Sigma },
  { id: "quality", label: "Data Quality", icon: ShieldCheck },
  { id: "reconciliation", label: "Reconciliation", icon: GitCompareArrows },
  { id: "reports", label: "Weekly Reports", icon: Mail },
];

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
          <path d="M6 5v14M18 5v14M6 12h12" />
        </svg>
      </div>
      <div className="leading-tight">
        <div className="text-[14px] font-semibold tracking-tight text-slate-900">Hevo Commerce</div>
        <div className="text-[10.5px] text-slate-500">Proposed feature · prototype</div>
      </div>
    </div>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const app = useApp();
  const tour = useTour();
  const openDQ = app.exceptions.filter((e) => e.status === "open").length;
  const item = (id: Route, label: string, Icon: typeof LayoutDashboard, badge?: ReactNode) => {
    const active = app.route === id;
    return (
      <a
        key={id}
        href={`#/${id}`}
        onClick={(e) => {
          e.preventDefault();
          app.navigate(id);
          onNavigate?.();
        }}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
          active ? "bg-white text-brand-700 shadow-sm ring-1 ring-slate-200" : "text-slate-600 hover:bg-white/70 hover:text-slate-900",
        )}
      >
        <Icon className={cn("h-4 w-4", active ? "text-brand-600" : "text-slate-400 group-hover:text-slate-600")} />
        <span className="flex-1">{label}</span>
        {badge}
      </a>
    );
  };
  return (
    <nav aria-label="Primary" className="flex h-full flex-col gap-1 bg-slate-100/70 px-3 py-4">
      <div className="mb-5 px-1">
        <Logo />
      </div>
      <div className="label mb-1 px-2.5">Weekly sales model</div>
      <div className="flex flex-col gap-0.5">
        {NAV.map((n, i) =>
          item(
            n.id,
            n.label,
            n.icon,
            n.id === "quality" && openDQ > 0 ? (
              <span className={cn("rounded-full px-1.5 text-[10.5px] font-semibold tabular", app.readiness.blocking ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800")}>{openDQ}</span>
            ) : n.id !== "overview" ? (
              <span className="text-[10.5px] text-slate-400 tabular">{i}</span>
            ) : undefined,
          ),
        )}
      </div>
      <div className="mt-auto flex flex-col gap-0.5 border-t border-slate-200 pt-3">
        {item("settings", "Settings", Settings)}
        {item("help", "Help", LifeBuoy)}
        <button
          onClick={() => {
            onNavigate?.();
            tour.start();
          }}
          className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] font-medium text-slate-600 hover:bg-white/70 hover:text-slate-900"
        >
          <RotateCcw className="h-4 w-4 text-slate-400" />
          Restart Guided Tour
        </button>
      </div>
    </nav>
  );
}

export function ReadinessBadge({ size = "md" }: { size?: "sm" | "md" }) {
  const { readiness } = useApp();
  const tone = readiness.state === "blocked" ? "red" : readiness.state === "disclosures" ? "amber" : "green";
  const Icon = readiness.state === "blocked" ? XCircle : readiness.state === "disclosures" ? AlertTriangle : CheckCircle2;
  return (
    <Badge tone={tone} className={size === "sm" ? "" : "py-1"}>
      <Icon className="h-3 w-3" /> {READINESS_LABEL[readiness.state]}
    </Badge>
  );
}

function Header({ onMenu }: { onMenu: () => void }) {
  const app = useApp();
  const tour = useTour();
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
        <Button variant="ghost" size="sm" className="lg:hidden" onClick={onMenu} aria-label="Open navigation">
          <Menu className="h-5 w-5" />
        </Button>
        <div className="hidden sm:block lg:hidden">
          <div className="text-[13.5px] font-semibold">Hevo Commerce</div>
        </div>
        <div className="hidden min-w-0 items-center gap-2 lg:flex">
          <span className="text-[12px] text-slate-500">Demo workspace:</span>
          <span className="text-[13px] font-semibold text-slate-900">Crunch &amp; Co.</span>
        </div>
        <div className="mx-1 hidden h-5 w-px bg-slate-200 lg:block" />
        <div className="flex items-center gap-2">
          <label htmlFor="week" className="hidden text-[12px] text-slate-500 md:block">Reporting week</label>
          <Select
            id="week"
            label="Reporting week"
            className="max-w-[160px] sm:max-w-none"
            value={app.week}
            onChange={(v) => app.set("week", v as WeekId)}
            options={(Object.keys(WEEKS) as WeekId[]).map((w) => ({ value: w, label: `${WEEKS[w].short} · ${WEEKS[w].label}` }))}
          />
        </div>
        <div className="hidden items-center gap-1.5 text-[12px] text-slate-500 xl:flex">
          <Clock className="h-3.5 w-3.5" />
          Data as of <span className="font-medium text-slate-700">{dateTime(app.report.asOf)}</span>
          <span className="text-slate-400">({app.report.version})</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span title="All data in this prototype is synthetic. No live merchant data is retrieved." className="hidden sm:inline-flex">
            <Badge tone="violet" className="py-1">
              <FlaskConical className="h-3 w-3" /> Synthetic data
            </Badge>
          </span>
          <Button variant="subtle" onClick={tour.start} aria-label="Start guided tour">
            <Compass className="h-4 w-4" /> <span className="hidden sm:inline">Guided Tour</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Toasts() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[90] flex w-[min(380px,calc(100vw-32px))] flex-col gap-2" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="tour-pop pointer-events-auto flex gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-pop">
          <div className="mt-0.5">
            {t.tone === "success" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : t.tone === "warning" ? <AlertTriangle className="h-4 w-4 text-amber-600" /> : <Info className="h-4 w-4 text-brand-600" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-slate-900">{t.title}</div>
            {t.body && <div className="mt-0.5 text-[12px] text-slate-600">{t.body}</div>}
          </div>
          <button onClick={() => dismissToast(t.id)} className="self-start rounded p-0.5 text-slate-400 hover:text-slate-700" aria-label="Dismiss notification">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[100] focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:shadow">
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-slate-200 lg:block">
        <Sidebar />
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="panel-in absolute inset-y-0 left-0 w-64 border-r border-slate-200 bg-slate-50 shadow-pop">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
      <div className="lg:pl-60">
        <Header onMenu={() => setMobileOpen(true)} />
        <main id="main" className="mx-auto max-w-[1360px] px-4 py-6 lg:px-6">
          {children}
        </main>
      </div>
      <Toasts />
    </div>
  );
}
