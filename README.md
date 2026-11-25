# Hevo Commerce — *Five channels. One trusted Monday number.*

**▶ Live demo: [abitha-rao.github.io/hevo-commerce](https://abitha-rao.github.io/hevo-commerce/)** &nbsp;·&nbsp; **Code:** [github.com/Abitha-Rao/hevo-commerce](https://github.com/Abitha-Rao/hevo-commerce)<br> &nbsp;·&nbsp; *Product Manager take-home for Hevo Data. A proposed feature, built as a working prototype with synthetic data.*

---

## In one minute

A snack brand sells on **five platforms**: its own Shopify store, Amazon India, and three quick-commerce apps (Blinkit, Zepto, Swiggy Instamart). Every Monday the founder asks three simple questions:

1. How much did we sell last week?
2. Which products and cities drove it?
3. Which channel is growing?

Today an analyst spends **a whole day** downloading five sets of reports and stitching them together in Excel. Even then, the numbers don't agree.

**The reason isn't a data-pipeline problem.** Hevo can already pull the data out. The trouble is that each platform counts a "sale" differently:

| Platform quirk (illustrative) | What goes wrong if you just add the numbers |
|---|---|
| Shopify's total still includes **cancelled** orders | Sales are overstated |
| Blinkit's easiest figure is what the brand **sold to Blinkit's warehouse** (wholesale), not what shoppers bought | Two different things get mixed into one number |
| Instamart counts an order on the day it was **delivered**, not ordered | A Sunday-night order lands in the wrong week |
| Zepto sells a **6-pack** while others sell single packets | You can't compare volumes |
| Some platforms give **no city** at all | City charts quietly become guesses |
| A refund arrives **on Tuesday**, after Monday's report | Last week's number silently changes |

**Hevo Commerce** is a proposed layer on top of Hevo's existing data connectors. It turns these five inconsistent sources into **one comparable, explainable weekly number**, and it is honest about anything it can't measure.

## What the prototype shows

The demo uses a tiny made-up week so every rupee can be traced by hand:

- Adding up the five platforms' own reports gives **₹1,650**, a number that means nothing because it mixes different definitions.
- After applying one consistent definition of a sale, the real figure is **₹1,450** of consumer sales on Monday.
- When a ₹50 refund arrives on Tuesday, the report is **revised to ₹1,400** as a new version. The Monday number is kept, not overwritten.
- If Blinkit's shopper-sales file is missing, the total is **₹1,150, covering 4 of 5 channels**. It says so clearly instead of pretending Blinkit sold ₹0.

### The six screens

| Screen | What it does | Why it matters |
|---|---|---|
| **Overview** | Answers the founder's question in one sentence, with charts by channel, growth, product and city | Readable in about 10 seconds |
| **Data Sources** | One card per platform, showing how its data arrives (existing connector or file upload) and what's confirmed vs unverified | Honest about what really works today |
| **Sales Model** | Sets *one* definition of a sale (which date, which discounts, how refunds count) and maps products so a 6-pack = 6 packets | Makes every channel comparable |
| **Data Quality** | A to-do list of problems (missing files, duplicates, unmapped products) with one-click fixes and a live "ready to publish" status | Missing data is never treated as zero sales |
| **Reconciliation** | The **Normalization Bridge**: a step-by-step chart from ₹1,650 to ₹1,450, where every step is clickable and shows its evidence | Builds trust in the number |
| **Weekly Reports** | A preview of the Monday 9 AM email, its schedule, and history comparing the original and revised versions | The founder gets the answer without opening a dashboard |

A **six-step guided tour** starts automatically on the first visit and walks through the whole story. It can be restarted from the header.

### Principles the product never breaks

- Missing data never becomes zero sales.
- Warehouse sales (sell-in) and shopper sales (sell-out) are never added together.
- City-level numbers are never invented.
- Every revision is versioned and traceable.

### What's real and what's pretend

Everything you can click works, and every number is calculated live from the underlying records. The **data is synthetic**, platform connections are **simulated**, and "Send test email" doesn't actually send anything. Platform behaviours marked *unverified* are assumptions to confirm with the brand, not established facts.

### How to try it (2 minutes)

1. Open the live demo and follow the tour.
2. On **Reconciliation**, switch *Blinkit sell-out* to **Unavailable** and watch the coverage drop and the total change. Then switch *Report version* to **After Tuesday refund**.
3. On **Data Quality**, fix the issues one by one and watch the status move from *Blocked* to *Ready*.
4. On **Sales Model**, change the discount setting and watch every screen update.

---

# Detailed write-up (for reviewers and engineers)

## 1. The business problem

Crunch & Co., a D2C snack brand, sells on Shopify, Amazon India, Blinkit, Zepto and Swiggy Instamart. Every Monday the founder asks: *how much did we sell last week, which products and cities drove it, and which channel is growing?* An analyst spends a day downloading reports and reconciling them in Excel, and the numbers still disagree.

They disagree because the platforms use different commercial models (marketplace vs inventory-led), date bases (order vs delivery vs invoice), financial definitions (cancellations, refunds, discount funding), product identifiers (a 6-pack vs single packets) and geography (city, state or none).

**Core insight:** *getting the data out* and *making it economically comparable* are two different problems. Hevo already handles most of the first. Hevo Commerce adds a reusable, business-level sales model on top.

## 2. Product decisions and scope

| Decision | Why |
|---|---|
| **Consumer sell-out** is the primary metric. Wholesale sell-in is a separate measure, and brand revenue is a future capability | Sell-in and sell-out answer different questions. Adding them double-counts. |
| Default definition: merchandise value after customer-facing discounts, before tax and shipping, by **original order date**, Mon–Sun IST, cancellations excluded, refunds **restated to the original order week**, with an as-of timestamp | It's the closest common denominator the sources support. |
| **Missing ≠ zero.** Unavailable sources are excluded, coverage is reduced and disclosed | A ₹0 for a missing source would quietly understate sales and invent a decline. |
| **Like-for-like growth**: only channels comparable in both weeks | Otherwise a missing file would look like a drop in sales. |
| City is **never inferred**. State-only and unknown geography are shown separately | Inventing city data damages trust. |
| **Versioned snapshots** (Monday v1, revised v2) | A Tuesday refund must not silently rewrite Monday's number. |
| A **Normalization Bridge** instead of an "accounting reconciliation" | It explains definitional differences. It does not audit ledgers. |
| Deterministic validation and analyst-confirmed mapping, with **no AI mapping** | The prototype is about trust. |

**Out of scope:** real-time ingestion, scraping, inventory and ad analytics, forecasting, AI column mapping, WhatsApp delivery, and reconciled brand revenue. **Future opportunities** (labelled in Settings): a GSTR-1 monthly cross-check (GSTR-8 only as an independent marketplace check), reusable commerce templates, and EDI 852-style sell-through feeds.

## 3. Running it

```bash
cd hevo-commerce
npm install
npm run dev      # http://localhost:5174
npm run build    # type-check + production build
```

**Hosting:** the live demo is served by GitHub Pages from the `gh-pages` branch. To redeploy, run `PAGES_BASE=/hevo-commerce/ npm run build` and push `dist/` to `gh-pages`. A `vercel.json` is included for one-click Vercel import.

The guided tour launches on the first visit. You can restart it from the header or the sidebar. Use **Settings → Reset demo workspace** to restore the initial state.

## 4. Synthetic dataset and calculations

Week 47 (16–22 Nov 2026) reproduces the assignment scenario exactly (all Masala Chips, ₹50/packet, ex-tax and shipping):

| ID | Channel | Units × mult | Gross | Adjustment |
|---|---|---|---|---|
| S1 | Shopify | 2 × 1 | 100 | — |
| S2 | Shopify | 4 × 1 | 200 | ₹50 partial refund on Tue 24 Nov |
| S3 | Shopify | 2 × 1 | 100 | Cancelled within the week |
| A1 | Amazon | 4 × 1 | 200 | ₹20 brand-funded discount |
| A2 | Amazon | 2 × 1 | 100 | — (also appears in an overlapping re-download, so it's a duplicate) |
| B1, B2 | Blinkit sell-out | 4, 2 × 1 | 200, 100 | — |
| Z1 | Zepto | 1 × **6** | 300 | ₹30 platform-funded discount (illustrative) |
| Z2 | Zepto | 2 × 1 | 100 | — |
| I1 | Instamart | 4 × 1 | 200 | Ordered Sun 23:50, delivered Mon |
| BINV | Blinkit invoice | 20 × ₹30 | 600 | Wholesale sell-in |

**Normalization Bridge (computed, not hardcoded):**
Raw ₹1,650 → −₹100 cancellation → −₹600 sell-in → +₹300 Blinkit sell-out → +₹200 Instamart order-date shift → **₹1,450** Monday → −₹50 restated refund → **₹1,400** revised.

| Scenario | Monday | After refund | Coverage |
|---|---|---|---|
| All available | ₹1,450 | ₹1,400 | 5/5 |
| Blinkit sell-out unavailable | ₹1,150 | ₹1,100 | 4/5 (sell-in ₹600 shown separately) |
| Instamart order date unavailable | ₹1,250 | ₹1,200 | 4/5 |
| Both unavailable | ₹950 | ₹900 | 3/5 |

**Prior week (Week 46, 9–15 Nov)** is a separate, clearly labelled synthetic dataset that exists only for growth: Shopify 250, Amazon 200, Blinkit 150 (sell-in 300), Zepto 200, Instamart 150, for a total of ₹950. Week 47 Monday is +₹500 (+52.6%), and Zepto is the largest contributor (+₹170).

To give product and city breakdowns, dimensions were added to the existing records rather than adding records, so every total above still ties out. The cities are Shopify S1/S3 Bengaluru and S2 Mumbai, Amazon A1 Bengaluru, A2 Maharashtra (state only), Blinkit B1 Bengaluru and B2 Delhi. Zepto and Instamart are unknown.

**Definition controls recalculate:** discount treatment (+₹30 or +₹50) and refund treatment (adjustment week keeps ₹1,450). The reporting period (Sun–Sat, month) and recognition date (delivery, settlement) options are flagged **unsupported by available data**, and the supported default stays in force.

## 5. Assumptions and unverified capabilities

- Shopify and Amazon reuse existing Hevo connectors. Here they are *simulated* and read synthetic records.
- Blinkit: predominantly inventory-led. Supplier entitlement to sell-out data is **unverified**.
- Zepto: a supplier-transactions export depends on availability. City analytics are documented through paid Atom. The downloadable granularity is **unverified**.
- Instamart: brand onboarding is confirmed. The report schema and date basis are **unverified**.
- The raw reporting bases (Blinkit = sell-in, Instamart = delivery date) are illustrative assumptions, not verified platform behaviour.

## 6. Functional vs simulated

**Functional:** every calculation; the scenario toggles; the sales-definition controls; SKU mapping with packet recalculation; CSV upload with column validation and preview (your file or a "Load demo file"); the exception actions (upload, remove duplicate, map SKU, acknowledge, exclude source) with live readiness; the report versions and their diff; the schedule config; localStorage persistence; and the spotlight tour with keyboard support.

**Simulated:** connector status, sync times, "Send test email" (only shows a notice, nothing is sent) and "Publish revision" (recorded locally). A user-uploaded CSV is validated and previewed, but totals keep using the matching synthetic records so the demo stays deterministic.

## 7. Architecture

```
src/
  data/       types.ts (canonical schema + definition), rawSources.ts (source-shaped synthetic payloads),
              catalog.ts (products, SKU mappings), channels.ts (capabilities, evidence, folders)
  lib/
    adapters/ one adapter per channel: raw → CanonicalSalesRecord[] + raw report value; dedupe in index.ts
    engine.ts normalization (definition, snapshot, gating, mapping) → week report, breakdowns, bridge, growth
    quality.ts deterministic exception derivation + readiness
    csv.ts, demoFiles.ts, format.ts
  state/      store.tsx (context, persistence, derived reports)
  components/ ui kit, layout shell, tour (spotlight engine + steps), shared panels/dialogs
  screens/    Overview, DataSources, SalesModel, DataQuality, Reconciliation, WeeklyReports, Settings/Help
```

## 8. Becoming a reusable Hevo template

The parts that are specific to a brand are **data**: channel adapters, SKU mappings and the sales definition. The parts that can be reused are **code**: the canonical `sales_line` schema, the normalization rules, the validation checks and the bridge. As a Hevo template this would mean:

1. Pipelines for the source connectors and file folders, landing in a raw schema.
2. A versioned `commerce.sales_line` model (dbt-style) built from adapter mappings per channel.
3. A definition config (period, date basis, refund and discount treatment) that the transformations read.
4. Data-quality checks as gating tests before a scheduled publish, with immutable snapshots for revisions.
5. A report-delivery job that reads the latest published snapshot.

New brands would bring their own SKU and geography mappings. New channels need only a new adapter.
