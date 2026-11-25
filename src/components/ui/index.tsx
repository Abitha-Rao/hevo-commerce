import { forwardRef, useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { X, Info } from "lucide-react";
import { cn } from "@/lib/cn";

/* ---------------- Button ---------------- */
type Variant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" }>(
  ({ variant = "secondary", size = "md", className, ...p }, ref) => (
    <button
      ref={ref}
      {...p}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap",
        size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-[13px]",
        variant === "primary" && "bg-brand-600 text-white hover:bg-brand-700 shadow-sm",
        variant === "secondary" && "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm",
        variant === "ghost" && "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        variant === "subtle" && "bg-brand-50 text-brand-700 hover:bg-brand-100",
        variant === "danger" && "bg-white text-red-700 border border-red-200 hover:bg-red-50",
        className,
      )}
    />
  ),
);
Button.displayName = "Button";

/* ---------------- Card ---------------- */
export function Card({ className, children, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...p} className={cn("rounded-lg border border-slate-200 bg-white shadow-card", className)}>
      {children}
    </div>
  );
}
export function CardHeader({ title, subtitle, right, className, icon }: { title: ReactNode; subtitle?: ReactNode; right?: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 px-4 pt-3.5 pb-3", className)}>
      <div className="min-w-0">
        <h3 className="flex items-center gap-2 text-[13.5px] font-semibold text-slate-900">{icon}{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

/* ---------------- Badge ---------------- */
export type Tone = "green" | "amber" | "red" | "slate" | "indigo" | "sky" | "violet";
const TONES: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/25",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  slate: "bg-slate-100 text-slate-600 ring-slate-500/15",
  indigo: "bg-brand-50 text-brand-700 ring-brand-600/20",
  sky: "bg-sky-50 text-sky-700 ring-sky-600/20",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/20",
};
export function Badge({ tone = "slate", children, className, dot }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset whitespace-nowrap", TONES[tone], className)}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", { green: "bg-emerald-500", amber: "bg-amber-500", red: "bg-red-500", slate: "bg-slate-400", indigo: "bg-brand-500", sky: "bg-sky-500", violet: "bg-violet-500" }[tone])} />}
      {children}
    </span>
  );
}

/* ---------------- Switch ---------------- */
export function Switch({ checked, onChange, label, id, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; id?: string; disabled?: boolean }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn("relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50", checked ? "bg-brand-600" : "bg-slate-300")}
    >
      <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform", checked ? "translate-x-[18px]" : "translate-x-0.5")} />
    </button>
  );
}

/* ---------------- Segmented control ---------------- */
export function Segmented<T extends string>({ value, onChange, options, label, size = "md", className }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; tone?: "warn" }[]; label: string; size?: "sm" | "md"; className?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex rounded-md bg-slate-100 p-0.5 ring-1 ring-inset ring-slate-200", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-[5px] font-medium transition-all whitespace-nowrap",
              size === "sm" ? "px-2 py-1 text-[11.5px]" : "px-2.5 py-1 text-xs",
              active ? (o.tone === "warn" ? "bg-white text-amber-700 shadow-sm ring-1 ring-amber-200" : "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200") : "text-slate-500 hover:text-slate-800",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Select ---------------- */
export function Select({ value, onChange, options, label, className, id }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; label: string; className?: string; id?: string }) {
  return (
    <select
      id={id}
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn("h-8 rounded-md border border-slate-200 bg-white pl-2.5 pr-7 text-[13px] text-slate-800 shadow-sm hover:border-slate-300 focus:border-brand-500", className)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

/* ---------------- Side panel ---------------- */
export function SidePanel({ open, onClose, title, subtitle, children, width = "max-w-xl" }: { open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode; width?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); prev?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} aria-hidden />
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className={cn("panel-in relative flex h-full w-full flex-col bg-white shadow-pop outline-none", width)}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-[15px] font-semibold text-slate-900">{title}</h2>
            {subtitle && <div className="mt-0.5 text-xs text-slate-500">{subtitle}</div>}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close panel"><X className="h-4 w-4" /></Button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

/* ---------------- Modal ---------------- */
export function Modal({ open, onClose, title, children, footer, width = "max-w-2xl" }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; width?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); prev?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-hidden />
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className={cn("tour-pop relative flex max-h-[90vh] w-full flex-col rounded-xl bg-white shadow-pop outline-none", width)}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h2 id={titleId} className="text-[15px] font-semibold">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog"><X className="h-4 w-4" /></Button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50/60 px-5 py-3 rounded-b-xl">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------------- Misc ---------------- */
export function Hint({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("group relative inline-flex", className)}>
      <Info className="h-3.5 w-3.5 text-slate-400" aria-hidden />
      <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 hidden w-60 -translate-x-1/2 rounded-md bg-slate-900 px-2.5 py-1.5 text-[11.5px] font-normal normal-case tracking-normal leading-snug text-white shadow-pop group-hover:block group-focus-within:block">
        {children}
      </span>
    </span>
  );
}

export function Callout({ tone = "amber", icon, title, children, action, className }: { tone?: "amber" | "red" | "indigo" | "green" | "slate"; icon?: ReactNode; title: ReactNode; children?: ReactNode; action?: ReactNode; className?: string }) {
  const t = {
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    red: "border-red-200 bg-red-50 text-red-900",
    indigo: "border-brand-200 bg-brand-50 text-brand-900",
    green: "border-emerald-200 bg-emerald-50 text-emerald-900",
    slate: "border-slate-200 bg-slate-50 text-slate-800",
  }[tone];
  return (
    <div className={cn("flex flex-wrap items-start gap-3 rounded-lg border px-3.5 py-2.5", t, className)}>
      {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold">{title}</div>
        {children && <div className="mt-0.5 text-[12.5px] opacity-90">{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, description, right }: { title: string; description: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-1 max-w-3xl text-[13px] text-slate-500">{description}</p>
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  );
}

export function SyntheticTag({ className }: { className?: string }) {
  return <Badge tone="violet" className={className}>Synthetic</Badge>;
}
