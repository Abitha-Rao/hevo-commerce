import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Mail, X } from "lucide-react";
import { useApp } from "@/state/store";
import { Button } from "@/components/ui";
import { rupees } from "@/lib/format";
import { TOUR_STEPS } from "./steps";
import { cn } from "@/lib/cn";

interface TourCtx {
  active: boolean;
  start: () => void;
}
const Ctx = createContext<TourCtx>({ active: false, start: () => {} });
export const useTour = () => useContext(Ctx);

const PAD = 8;
const GAP = 14;

type Rect = { top: number; left: number; width: number; height: number };

function clampRect(r: DOMRect): Rect {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const top = Math.max(r.top - PAD, 8);
  const left = Math.max(r.left - PAD, 8);
  const bottom = Math.min(r.bottom + PAD, vh - 8);
  const right = Math.min(r.right + PAD, vw - 8);
  return { top, left, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}

function holePath(r: Rect, vw: number, vh: number, radius = 10) {
  const { top: y, left: x, width: w, height: h } = r;
  const rr = Math.min(radius, w / 2, h / 2);
  return `M0 0H${vw}V${vh}H0Z M${x + rr} ${y}H${x + w - rr}A${rr} ${rr} 0 0 1 ${x + w} ${y + rr}V${y + h - rr}A${rr} ${rr} 0 0 1 ${x + w - rr} ${y + h}H${x + rr}A${rr} ${rr} 0 0 1 ${x} ${y + h - rr}V${y + rr}A${rr} ${rr} 0 0 1 ${x + rr} ${y}Z`;
}

export function TourProvider({ children }: { children: ReactNode }) {
  const app = useApp();
  const [index, setIndex] = useState<number | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [done, setDone] = useState(false);
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  const popRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [popSize, setPopSize] = useState({ w: 360, h: 220 });
  const targetRef = useRef<HTMLElement | null>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  const active = index !== null;
  const step = active ? TOUR_STEPS[index] : null;

  const start = useCallback(() => {
    prevFocus.current = document.activeElement as HTMLElement | null;
    app.openChannel(null);
    setDone(false);
    setIndex(0);
  }, [app]);

  const end = useCallback(
    (completed: boolean) => {
      setIndex(null);
      setRect(null);
      targetRef.current = null;
      app.set("tourCompleted", true);
      if (completed) setDone(true);
      else prevFocus.current?.focus?.();
    },
    [app],
  );

  // Auto-launch on first visit
  const startRef = useRef(start);
  startRef.current = start;
  useEffect(() => {
    if (app.tourCompleted) return;
    const t = setTimeout(() => startRef.current(), 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const measure = useCallback(() => {
    setVp({ w: window.innerWidth, h: window.innerHeight });
    if (targetRef.current) setRect(clampRect(targetRef.current.getBoundingClientRect()));
  }, []);

  // Navigate + locate target for each step
  useEffect(() => {
    if (!step) return;
    let cancelled = false;
    setRect(null);
    targetRef.current = null;
    app.navigate(step.route);
    const t0 = performance.now();
    const find = () => {
      if (cancelled) return;
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      if (el) {
        targetRef.current = el;
        const r = el.getBoundingClientRect();
        const tall = r.height > window.innerHeight * 0.6;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: tall ? "start" : "center" });
        setTimeout(() => {
          if (cancelled) return;
          measure();
          titleRef.current?.focus();
        }, reduce ? 30 : 420);
      } else if (performance.now() - t0 < 2500) requestAnimationFrame(find);
    };
    requestAnimationFrame(find);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Keep spotlight glued to the element
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    window.addEventListener("scroll", on, true);
    window.addEventListener("resize", on);
    const ro = new ResizeObserver(on);
    if (targetRef.current) ro.observe(targetRef.current);
    const iv = setInterval(on, 600);
    return () => {
      window.removeEventListener("scroll", on, true);
      window.removeEventListener("resize", on);
      ro.disconnect();
      clearInterval(iv);
      cancelAnimationFrame(raf);
    };
  }, [active, measure, rect !== null]);

  useLayoutEffect(() => {
    if (popRef.current) {
      const b = popRef.current.getBoundingClientRect();
      if (Math.abs(b.height - popSize.h) > 1 || Math.abs(b.width - popSize.w) > 1) setPopSize({ w: b.width, h: b.height });
    }
  });

  const next = useCallback(() => {
    if (index === null) return;
    if (index >= TOUR_STEPS.length - 1) end(true);
    else setIndex(index + 1);
  }, [index, end]);
  const back = useCallback(() => {
    if (index) setIndex(index - 1);
  }, [index]);

  // Keyboard navigation
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA";
      if (e.key === "Escape") {
        e.preventDefault();
        end(false);
      } else if (!typing && e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (!typing && e.key === "ArrowLeft") {
        e.preventDefault();
        back();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, next, back, end]);

  // Popover placement
  let pos: { top: number; left: number } = { top: vp.h / 2 - popSize.h / 2, left: vp.w / 2 - popSize.w / 2 };
  let placement: "bottom" | "top" | "right" | "left" | "inside" = "inside";
  const mobile = vp.w < 640;
  if (rect && !mobile) {
    const below = vp.h - (rect.top + rect.height);
    const above = rect.top;
    const right = vp.w - (rect.left + rect.width);
    const pref = step?.placement ?? "bottom";
    const fits = {
      bottom: below >= popSize.h + GAP + 8,
      top: above >= popSize.h + GAP + 8,
      right: right >= popSize.w + GAP + 8,
      left: rect.left >= popSize.w + GAP + 8,
    };
    const orderList: ("bottom" | "top" | "right" | "left")[] = [pref, "bottom", "top", "right", "left"];
    placement = orderList.find((p) => fits[p]) ?? "inside";
    const clampX = (x: number) => Math.min(Math.max(x, 12), vp.w - popSize.w - 12);
    const clampY = (y: number) => Math.min(Math.max(y, 12), vp.h - popSize.h - 12);
    if (placement === "bottom") pos = { top: rect.top + rect.height + GAP, left: clampX(rect.left + Math.min(24, rect.width / 4)) };
    else if (placement === "top") pos = { top: rect.top - popSize.h - GAP, left: clampX(rect.left + Math.min(24, rect.width / 4)) };
    else if (placement === "right") pos = { top: clampY(rect.top + 8), left: rect.left + rect.width + GAP };
    else if (placement === "left") pos = { top: clampY(rect.top + 8), left: rect.left - popSize.w - GAP };
    else pos = { top: vp.h - popSize.h - 20, left: vp.w - popSize.w - 24 };
  } else if (mobile) {
    pos = { top: vp.h - popSize.h - 12, left: 12 };
  }

  const r = app.report;

  return (
    <Ctx.Provider value={{ active, start }}>
      {children}
      {active && step && (
        <div className="fixed inset-0 z-[80]" aria-hidden={false}>
          <svg className="absolute inset-0 h-full w-full" width={vp.w} height={vp.h} aria-hidden>
            <path
              d={rect ? holePath(rect, vp.w, vp.h) : `M0 0H${vp.w}V${vp.h}H0Z`}
              fill="rgb(15 23 42 / 0.58)"
              fillRule="evenodd"
              style={{ pointerEvents: "visiblePainted", transition: "d .28s cubic-bezier(.2,.8,.2,1)" }}
            />
          </svg>
          {rect && (
            <div
              className="tour-ring tour-pulse pointer-events-none absolute rounded-[10px] ring-2 ring-brand-500"
              style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
            />
          )}
          <div
            ref={popRef}
            role="dialog"
            aria-modal="false"
            aria-labelledby="tour-title"
            aria-describedby="tour-body"
            key={index}
            className={cn("tour-pop absolute rounded-xl border border-slate-200 bg-white p-4 shadow-pop", mobile ? "w-[calc(100vw-24px)]" : "w-[360px]")}
            style={{ top: pos.top, left: pos.left }}
            data-placement={placement}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-600">
                Step {index! + 1} of {TOUR_STEPS.length}
              </span>
              <button onClick={() => end(false)} className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Skip tour">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-3 flex gap-1" aria-hidden>
              {TOUR_STEPS.map((_, i) => (
                <span key={i} className={cn("h-1 flex-1 rounded-full transition-colors", i <= index! ? "bg-brand-600" : "bg-slate-200")} />
              ))}
            </div>
            <h2 id="tour-title" ref={titleRef} tabIndex={-1} className="text-[15px] font-semibold text-slate-900 outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
              {step.title}
            </h2>
            <p id="tour-body" className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
              {step.body}
            </p>
            {step.why && (
              <p className="mt-2 rounded-md bg-slate-50 px-2.5 py-2 text-[12px] leading-snug text-slate-600">
                <span className="font-semibold text-slate-800">Why it matters: </span>
                {step.why}
              </p>
            )}
            {step.tryIt && <p className="mt-2 text-[12px] font-medium text-brand-700">Try it: {step.tryIt}</p>}
            <div className="mt-4 flex items-center justify-between gap-2">
              <button onClick={() => end(false)} className="text-xs font-medium text-slate-500 hover:text-slate-800">
                Skip tour
              </button>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={back} disabled={index === 0}>
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </Button>
                {index! < TOUR_STEPS.length - 1 ? (
                  <Button size="sm" variant="primary" onClick={next}>
                    Next <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button size="sm" variant="primary" onClick={next}>
                    Finish <CheckCircle2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
            <p className="mt-3 hidden text-[10.5px] text-slate-400 sm:block">← → to move · Esc to skip</p>
          </div>
          <div aria-live="polite" className="sr-only">
            Step {index! + 1} of {TOUR_STEPS.length}: {step.title}
          </div>
        </div>
      )}
      {done && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/45" onClick={() => setDone(false)} aria-hidden />
          <div role="dialog" aria-modal="true" aria-labelledby="tour-done" className="tour-pop relative w-full max-w-md rounded-xl bg-white p-6 shadow-pop">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 ring-1 ring-emerald-200">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <h2 id="tour-done" className="text-lg font-semibold text-slate-900">Your Monday report is ready.</h2>
            <p className="mt-1 text-[13px] text-slate-600">
              {r.weekLabel}: <span className="font-semibold text-slate-900 tabular">{rupees(r.comparableTotal)}</span> comparable consumer sell-out across{" "}
              {r.comparableChannels.length} of 5 channels, with wholesale sell-in of {rupees(r.sellInTotal)} reported separately.
            </p>
            <p className="mt-2 text-[12px] text-slate-500">All figures come from a synthetic dataset. Nothing was sent or connected.</p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={() => setDone(false)} autoFocus>
                Explore on my own
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setDone(false);
                  app.navigate("reports");
                }}
              >
                <Mail className="h-4 w-4" /> Open weekly report
              </Button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
