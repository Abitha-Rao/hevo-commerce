import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ChannelId, Scenario, SalesDefinition, SkuMapping, WeekId } from "@/data/types";
import { DEFAULT_DEFINITION, DEFAULT_SCENARIO } from "@/data/types";
import { DEFAULT_SKU_MAPPINGS, mappingKey } from "@/data/catalog";
import { computeGrowth, computeWeekReport, type Growth, type WeekReport } from "@/lib/engine";
import { PRIOR_WEEK } from "@/lib/adapters";
import { deriveExceptions, readinessOf, type DQException, type Resolution } from "@/lib/quality";

export type Route = "overview" | "sources" | "model" | "quality" | "reconciliation" | "reports" | "settings" | "help";
export const ROUTES: Route[] = ["overview", "sources", "model", "quality", "reconciliation", "reports", "settings", "help"];

export interface UploadLog {
  folderId: string;
  fileName: string;
  rows: number;
  at: string;
  origin: "demo" | "user";
}

export interface Schedule {
  enabled: boolean;
  day: "monday";
  time: string;
  tz: "IST";
  recipient: string;
}

interface Persisted {
  week: WeekId;
  scenario: Scenario;
  definition: SalesDefinition;
  mappings: SkuMapping[];
  resolutions: Record<string, Resolution>;
  instamartReturnsReceived: boolean;
  uploads: UploadLog[];
  schedule: Schedule;
  unit: "inr" | "packets";
  tourCompleted: boolean;
  revisionPublished: boolean;
}

const KEY = "hevo-commerce-prototype-v1";

const DEFAULTS: Persisted = {
  week: "W47",
  scenario: DEFAULT_SCENARIO,
  definition: DEFAULT_DEFINITION,
  mappings: DEFAULT_SKU_MAPPINGS,
  resolutions: {},
  instamartReturnsReceived: false,
  uploads: [],
  schedule: { enabled: true, day: "monday", time: "09:00", tz: "IST", recipient: "founder@crunchandco.example" },
  unit: "inr",
  tourCompleted: false,
  revisionPublished: false,
};

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    return { ...DEFAULTS, ...parsed, scenario: { ...DEFAULTS.scenario, ...parsed.scenario }, definition: { ...DEFAULTS.definition, ...parsed.definition }, schedule: { ...DEFAULTS.schedule, ...parsed.schedule } };
  } catch {
    return DEFAULTS;
  }
}

export interface Toast {
  id: number;
  title: string;
  body?: string;
  tone: "success" | "info" | "warning";
}

interface Ctx extends Persisted {
  route: Route;
  navigate: (r: Route) => void;
  report: WeekReport;
  priorReport: WeekReport | null;
  growth: Growth;
  reportFor: (snapshot: "monday" | "tuesday") => WeekReport;
  exceptions: DQException[];
  readiness: ReturnType<typeof readinessOf>;
  set: <K extends keyof Persisted>(k: K, v: Persisted[K]) => void;
  setScenario: (p: Partial<Scenario>) => void;
  setDefinition: (p: Partial<SalesDefinition>) => void;
  updateMapping: (m: SkuMapping) => void;
  resolve: (id: string, r: Omit<Resolution, "at">) => void;
  reopen: (id: string) => void;
  logUpload: (u: Omit<UploadLog, "at">) => void;
  resetDemo: () => void;
  toasts: Toast[];
  toast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: number) => void;
  channelPanel: ChannelId | null;
  openChannel: (c: ChannelId | null) => void;
}

const AppCtx = createContext<Ctx | null>(null);

function routeFromHash(): Route {
  const h = window.location.hash.replace(/^#\/?/, "") as Route;
  return ROUTES.includes(h) ? h : "overview";
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(load);
  const [route, setRoute] = useState<Route>(routeFromHash);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [channelPanel, openChannel] = useState<ChannelId | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable — prototype still works in-memory */
    }
  }, [state]);

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = useCallback((r: Route) => {
    if (window.location.hash !== `#/${r}`) window.location.hash = `/${r}`;
    setRoute(r);
  }, []);

  const set = useCallback(<K extends keyof Persisted>(k: K, v: Persisted[K]) => setState((s) => ({ ...s, [k]: v })), []);

  const excludedByAnalyst = useMemo(() => {
    const out: Partial<Record<ChannelId, boolean>> = {};
    if (state.resolutions["missing-blinkit-sellout"]?.status === "excluded") out.blinkit = true;
    if (state.resolutions["granularity-instamart-orderdate"]?.status === "excluded") out.instamart = true;
    return out;
  }, [state.resolutions]);

  const reportFor = useCallback(
    (snapshot: "monday" | "tuesday") =>
      computeWeekReport({ week: state.week, scenario: { ...state.scenario, snapshot }, definition: state.definition, mappings: state.mappings, excludedByAnalyst }),
    [state.week, state.scenario, state.definition, state.mappings, excludedByAnalyst],
  );

  const report = useMemo(
    () => computeWeekReport({ week: state.week, scenario: state.scenario, definition: state.definition, mappings: state.mappings, excludedByAnalyst }),
    [state.week, state.scenario, state.definition, state.mappings, excludedByAnalyst],
  );
  const priorReport = useMemo(() => {
    const p = PRIOR_WEEK[state.week];
    return p ? computeWeekReport({ week: p, scenario: state.scenario, definition: state.definition, mappings: state.mappings, excludedByAnalyst: {} }) : null;
  }, [state.week, state.scenario, state.definition, state.mappings]);
  const growth = useMemo(() => computeGrowth(report, priorReport), [report, priorReport]);

  const exceptions = useMemo(
    () => deriveExceptions({ week: state.week, scenario: state.scenario, mappings: state.mappings, resolutions: state.resolutions, instamartReturnsReceived: state.instamartReturnsReceived }),
    [state.week, state.scenario, state.mappings, state.resolutions, state.instamartReturnsReceived],
  );
  const readiness = useMemo(() => readinessOf(exceptions), [exceptions]);

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts, { ...t, id }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 5200);
  }, []);

  const value: Ctx = {
    ...state,
    route,
    navigate,
    report,
    priorReport,
    growth,
    reportFor,
    exceptions,
    readiness,
    set,
    setScenario: (p) => setState((s) => ({ ...s, scenario: { ...s.scenario, ...p } })),
    setDefinition: (p) => setState((s) => ({ ...s, definition: { ...s.definition, ...p } })),
    updateMapping: (m) =>
      setState((s) => ({ ...s, mappings: s.mappings.map((x) => (mappingKey(x) === mappingKey(m) ? m : x)) })),
    resolve: (id, r) =>
      setState((s) => ({ ...s, resolutions: { ...s.resolutions, [id]: { ...r, at: new Date().toISOString() } } })),
    reopen: (id) =>
      setState((s) => {
        const next = { ...s.resolutions };
        delete next[id];
        return { ...s, resolutions: next };
      }),
    logUpload: (u) => setState((s) => ({ ...s, uploads: [{ ...u, at: new Date().toISOString() }, ...s.uploads].slice(0, 20) })),
    resetDemo: () => setState((s) => ({ ...DEFAULTS, tourCompleted: s.tourCompleted })),
    toasts,
    toast,
    dismissToast: (id) => setToasts((ts) => ts.filter((x) => x.id !== id)),
    channelPanel,
    openChannel,
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp outside provider");
  return c;
}
