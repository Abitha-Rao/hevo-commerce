const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export function rupees(n: number, opts: { sign?: boolean } = {}): string {
  const abs = inr.format(Math.abs(Math.round(n)));
  if (opts.sign) {
    if (n > 0) return `+₹${abs}`;
    if (n < 0) return `−₹${abs}`;
    return `₹${abs}`;
  }
  return n < 0 ? `−₹${abs}` : `₹${abs}`;
}

export function num(n: number): string {
  return inr.format(n);
}

export function pct(n: number | null, digits = 1): string {
  if (n === null || !isFinite(n)) return "—";
  const s = (Math.abs(n) * 100).toFixed(digits);
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${s}%`;
}

const dtFmt = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata",
});
const dFmt = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Asia/Kolkata",
});

export function dateTime(iso: string | null): string {
  if (!iso) return "—";
  return dtFmt.format(new Date(iso)).replace(/\b(am|pm)\b/, (m) => m.toUpperCase()) + " IST";
}
export function dateOnly(iso: string | null): string {
  if (!iso) return "—";
  return dFmt.format(new Date(iso));
}
