/** Minimal RFC-4180-ish CSV parser (quotes, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}

export interface CsvValidation {
  ok: boolean;
  header: string[];
  rows: string[][];
  missing: string[];
  extra: string[];
  errors: string[];
}

export function validateCsv(text: string, expected: string[]): CsvValidation {
  const all = parseCsv(text);
  if (!all.length) return { ok: false, header: [], rows: [], missing: expected, extra: [], errors: ["File is empty."] };
  const header = all[0].map((h) => h.trim().toLowerCase());
  const rows = all.slice(1);
  const missing = expected.filter((c) => !header.includes(c));
  const extra = header.filter((h) => !expected.includes(h));
  const errors: string[] = [];
  if (missing.length) errors.push(`Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`);
  rows.forEach((r, i) => {
    if (r.length !== header.length) errors.push(`Row ${i + 2}: expected ${header.length} values, found ${r.length}`);
  });
  return { ok: errors.length === 0, header, rows, missing, extra, errors: errors.slice(0, 5) };
}
