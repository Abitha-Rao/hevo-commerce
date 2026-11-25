import { RotateCcw, Rocket, Ban, BookOpen, Keyboard } from "lucide-react";
import { useApp } from "@/state/store";
import { useTour } from "@/components/tour/Tour";
import { Badge, Button, Card, CardHeader, PageHeader } from "@/components/ui";
import { PilotCriteria } from "./Overview";

export function Settings() {
  const app = useApp();
  return (
    <div className="space-y-5">
      <PageHeader title="Settings" description="Demo workspace: Crunch & Co. All choices are stored in this browser (localStorage)." />
      <Card>
        <CardHeader title="Demo data" subtitle="Restore every scenario, mapping, exception and schedule to its initial state. Tour completion is kept." />
        <div className="px-4 pb-4"><Button variant="danger" onClick={() => { app.resetDemo(); app.toast({ tone: "info", title: "Demo workspace reset" }); }}><RotateCcw className="h-4 w-4" /> Reset demo workspace</Button></div>
      </Card>
      <PilotCriteria />
      <Card>
        <CardHeader icon={<Rocket className="h-4 w-4 text-slate-400" />} title="Future opportunities" subtitle="Not built. Listed to show where the model could go." right={<Badge>Roadmap</Badge>} />
        <ul className="space-y-2 px-4 pb-4 text-[12.5px] text-slate-700">
          <li>· Monthly GST revenue cross-check using GSTR-1, with GSTR-8 only as an independent marketplace cross-check.</li>
          <li>· Reusable commerce modelling templates for other D2C brands on Hevo.</li>
          <li>· Standardized sell-through feeds inspired by EDI 852.</li>
          <li>· Brand revenue after commissions, fees and settlements.</li>
        </ul>
      </Card>
      <Card>
        <CardHeader icon={<Ban className="h-4 w-4 text-slate-400" />} title="Out of scope" />
        <div className="flex flex-wrap gap-1.5 px-4 pb-4">
          {["Real-time ingestion", "Scraping", "Inventory analytics", "Advertising analytics", "Forecasting", "AI column mapping", "WhatsApp delivery", "Reconciled brand revenue"].map((x) => <Badge key={x}>{x}</Badge>)}
        </div>
      </Card>
    </div>
  );
}

export function Help() {
  const tour = useTour();
  const terms: [string, string][] = [
    ["Consumer sell-out", "What consumers bought: merchandise value after customer-facing discounts, before tax and shipping, by original order date (IST)."],
    ["Wholesale sell-in", "Stock the brand invoices to an inventory-led platform. Shown separately; never added to sell-out."],
    ["Packet equivalents", "Selling units × pack multiplier, so a 6-pack equals six packets."],
    ["Comparable total", "Sum of normalized sales over channels that can be measured on the same definition."],
    ["Excluded, not zero", "A source with missing or non-comparable data is left out and disclosed. It is never shown as ₹0 sales."],
    ["Normalization Bridge", "Step-by-step walk from raw channel figures to comparable sell-out. Not an accounting reconciliation."],
    ["Restated cohort", "A late refund revises the week of the original order and creates a new report version."],
  ];
  return (
    <div className="space-y-5">
      <PageHeader title="Help" description="Glossary and controls for this prototype." right={<Button variant="subtle" onClick={tour.start}>Restart guided tour</Button>} />
      <Card>
        <CardHeader icon={<BookOpen className="h-4 w-4 text-slate-400" />} title="Glossary" />
        <dl className="divide-y divide-slate-100 border-t border-slate-100">
          {terms.map(([k, v]) => <div key={k} className="grid gap-1 px-4 py-2.5 text-[12.5px] sm:grid-cols-[200px_1fr]"><dt className="font-semibold">{k}</dt><dd className="text-slate-600">{v}</dd></div>)}
        </dl>
      </Card>
      <Card>
        <CardHeader icon={<Keyboard className="h-4 w-4 text-slate-400" />} title="Keyboard" />
        <ul className="space-y-1 px-4 pb-4 text-[12.5px] text-slate-600">
          <li>Tour: → next, ← back, Esc skip</li><li>Panels and dialogs: Esc to close</li>
        </ul>
      </Card>
    </div>
  );
}
