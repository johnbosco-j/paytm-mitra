"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, FlaskConical, Info, MessageSquareText, Sparkles, TriangleAlert } from "lucide-react";
import { useApp } from "@/components/providers";
import { Badge, Button, Card, Empty, ErrorNote, Field, Input, PageHeader, Spinner, cx } from "@/components/ui";
import { api, ApiError, type Opportunity, type Scenario } from "@/lib/api";
import { rupees, timeAgo, titleCase } from "@/lib/format";
import { reasonLabel } from "@/lib/i18n";
import { useApiData } from "@/lib/useApiData";

const STATUS: Record<Opportunity["status"], { label: string; tone: "success" | "caution" | "neutral" | "risk" }> = {
  ready: { label: "Ready to try", tone: "success" },
  needs_cost: { label: "Needs cost & price", tone: "caution" },
  insufficient_evidence: { label: "Keep listening", tone: "neutral" },
  unprofitable: { label: "Doesn't pay", tone: "risk" },
};

const COMPONENT_LABEL: Record<string, string> = {
  frequency: "How often asked",
  recency: "Asked recently",
  margin: "Margin",
  repeat_days: "Repeats across days",
  stock_gap: "Not in stock",
  evidence: "Number of records",
};

export default function OpportunitiesPage() {
  const { store } = useApp();
  const { data, error, loading, reload } = useApiData<{ items: Opportunity[]; window_days: number; generated_at: string }>("/opportunities?window=7", store?.id);
  // null = "first item open by default"; "" = all collapsed
  const [openState, setOpen] = useState<string | null>(null);
  const open = openState ?? data?.items[0]?.item ?? null;

  return (
    <div className="rise space-y-6">
      <PageHeader
        title="Opportunities"
        sub="Ranked from confirmed customer asks in the last 7 days and your real cost and price. Asks are not sales, so trials start small."
      />
      {loading && !data ? (
        <Spinner />
      ) : error ? (
        <ErrorNote message={error} onRetry={reload} />
      ) : !data?.items.length ? (
        <Empty
          icon={<Sparkles className="size-6" />}
          title="No opportunities yet"
          body="Opportunities appear after customers ask for an item at least 3 times on 2 different days."
          action={<Link href="/app/demand" className="text-signal underline">Log a missed request</Link>}
        />
      ) : (
        <ul className="space-y-3">
          {data.items.map((o) => (
            <OpportunityCard key={o.item} o={o} open={open === o.item} onToggle={() => setOpen(open === o.item ? "" : o.item)} onChanged={reload} />
          ))}
        </ul>
      )}
    </div>
  );
}

function OpportunityCard({ o, open, onToggle, onChanged }: { o: Opportunity; open: boolean; onToggle: () => void; onChanged: () => void }) {
  const st = STATUS[o.status];
  return (
    <li>
      <Card className={cx("p-0", open && "border-signal/40")}>
        <button onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-4 p-4 text-left">
          <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl border border-line bg-canvas">
            <span className="num text-lg font-semibold text-signal">{o.score}</span>
            <span className="text-[9px] text-faint">score</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-semibold">{titleCase(o.display_name)}</p>
              <Badge tone={st.tone}>{st.label}</Badge>
              {o.evidence.sample_share > 0 && <Badge tone="caution">includes SAMPLE rows</Badge>}
              {o.open_trial_id && <Badge tone="signal">trial open</Badge>}
            </div>
            <p className="mt-0.5 text-sm text-muted">
              <span className="num">{o.evidence.ask_total}</span> asks on <span className="num">{o.evidence.distinct_days}</span> days · last {timeAgo(o.evidence.last_ask_at)}
              {o.margin_pct && <> · margin <span className="num">{o.margin_pct}%</span></>}
              {o.status === "ready" && <> · suggested trial <b className="num text-ink">{o.proposal.quantity}</b></>}
            </p>
          </div>
          <ChevronDown className={cx("size-5 shrink-0 text-faint transition-transform", open && "rotate-180")} aria-hidden />
        </button>
        {open && <Detail o={o} onChanged={onChanged} />}
      </Card>
    </li>
  );
}

function Detail({ o, onChanged }: { o: Opportunity; onChanged: () => void }) {
  const { store, toast, lang } = useApp();
  const router = useRouter();
  const [qty, setQty] = useState(o.proposal.quantity || 1);
  const [fetched, setFetched] = useState<{ qty: number; scenarios: Scenario[] } | null>(null);
  const scen = qty === o.proposal.quantity ? o.scenarios : fetched?.qty === qty ? fetched.scenarios : (fetched?.scenarios ?? o.scenarios);
  const [scenErr, setScenErr] = useState<string | null>(null);
  const [explain, setExplain] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [proposing, setProposing] = useState(false);
  const canMoney = o.status === "ready" && o.product?.cost_price;

  useEffect(() => {
    if (!canMoney || qty === o.proposal.quantity) return;
    const h = setTimeout(async () => {
      try {
        const r = await api<{ scenarios: Scenario[] }>(`/opportunities/scenarios?item=${encodeURIComponent(o.item)}&qty=${qty}`);
        setFetched({ qty, scenarios: r.scenarios });
        setScenErr(null);
      } catch (e) {
        setScenErr(e instanceof ApiError ? e.message : "Could not update scenarios");
      }
    }, 180);
    return () => clearTimeout(h);
  }, [qty, canMoney, o.item, o.proposal.quantity]);

  async function askWhy() {
    setExplaining(true);
    try {
      const r = await api<{ explanation: string }>("/opportunities/explain", { body: { item: o.item, language: lang } });
      setExplain(r.explanation);
    } catch (e) {
      setExplain(e instanceof ApiError ? e.message : "Explanation unavailable.");
    } finally {
      setExplaining(false);
    }
  }

  async function propose() {
    setProposing(true);
    try {
      await api("/trials", { body: { item: o.item, quantity: qty } });
      toast(store?.role === "owner" ? "Trial proposed. Review and approve it on Trials." : "Trial proposed. The owner needs to approve it.");
      router.push("/app/trials");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Could not propose", "err");
    } finally {
      setProposing(false);
    }
  }

  const outlay = scen[0]?.purchase_outlay;
  return (
    <div className="space-y-5 border-t border-line p-4 md:p-5">
      {o.blockers.length > 0 && (
        <div className="space-y-1 rounded-xl border border-caution/30 bg-caution/5 p-3 text-sm text-caution">
          {o.blockers.map((b) => <p key={b} className="flex gap-2"><TriangleAlert className="mt-0.5 size-4 shrink-0" />{b}</p>)}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <section>
          <h3 className="mb-2 text-sm font-semibold">Evidence</h3>
          <ul className="space-y-1 text-sm text-muted">
            <li><span className="num text-ink">{o.evidence.ask_total}</span> confirmed customer asks in {o.evidence.window_days} days ({o.evidence.records} records)</li>
            <li>Asked on <span className="num text-ink">{o.evidence.distinct_days}</span> different days</li>
            <li>Why unsold: {o.evidence.reasons.map((r) => reasonLabel[lang][r] ?? r).join(", ")}</li>
            {o.product ? (
              <li>
                Catalog: {o.product.name} · cost {rupees(o.product.cost_price)} · price {rupees(o.product.sell_price)} · {o.product.stock_qty} in stock
                {o.product.shelf_life_days ? ` · shelf life ${o.product.shelf_life_days} days` : ""}
              </li>
            ) : (
              <li>Not in your catalog yet.</li>
            )}
          </ul>
          <h3 className="mt-4 mb-2 text-sm font-semibold">Why this score ({o.score_version})</h3>
          <ul className="space-y-1.5">
            {Object.entries(o.components).map(([k, v]) => (
              <li key={k} className="grid grid-cols-[130px_1fr_40px] items-center gap-2 text-xs">
                <span className="text-muted">{COMPONENT_LABEL[k] ?? k}</span>
                <span className="h-1.5 rounded bg-raised"><span className="block h-1.5 rounded bg-signal" style={{ width: `${v * 100}%` }} /></span>
                <span className="num text-right text-faint">×{o.weights[k]}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 flex gap-1.5 text-[11px] text-faint"><Info className="size-3.5 shrink-0" />A product heuristic to rank what to look at first, not a prediction of sales.</p>
        </section>

        <section>
          {o.status === "needs_cost" || (!o.product?.cost_price && o.status !== "insufficient_evidence") ? (
            <AddCost o={o} onSaved={onChanged} />
          ) : canMoney ? (
            <>
              <h3 className="mb-2 text-sm font-semibold">Trial size</h3>
              <ul className="mb-3 space-y-1 text-xs text-muted">{o.proposal.reasons.map((r) => <li key={r}>• {r}</li>)}</ul>
              <div className="flex items-center gap-3">
                <input type="range" min={1} max={Math.max(o.evidence.ask_total * 2, 10)} value={qty} onChange={(e) => setQty(Number(e.target.value))} aria-label="Trial quantity" className="flex-1 accent-[#38d6e6]" />
                <Input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} className="w-20" aria-label="Trial quantity number" />
                <span className="text-sm text-muted">{o.product?.unit}</span>
              </div>
              <p className="mt-3 text-sm">Money you put in now: <b className="num text-lg">{rupees(outlay)}</b></p>
              {scenErr && <p className="text-xs text-risk">{scenErr}</p>}
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead className="text-left text-xs text-faint">
                    <tr><th className="py-1 font-normal">If this many sell</th><th className="font-normal">Revenue</th><th className="font-normal">Gross profit</th><th className="font-normal">Cash vs outlay</th><th className="font-normal">Left over</th></tr>
                  </thead>
                  <tbody className="num">
                    {scen.map((s) => (
                      <tr key={s.units_sold} className="border-t border-line">
                        <td className="py-2">{s.units_sold} <span className="text-xs text-faint">({s.label})</span></td>
                        <td>{rupees(s.revenue)}</td>
                        <td className="text-success">{rupees(s.gross_profit)}</td>
                        <td className={Number(s.cash_difference) < 0 ? "text-caution" : ""}>{rupees(s.cash_difference)}</td>
                        <td>{s.leftover_units} <span className="text-xs text-faint">({rupees(s.leftover_value)})</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[11px] text-faint">
                Gross profit = sold × (price − cost). Cash vs outlay = money in − money spent; leftover stock is still worth its cost if it doesn&apos;t spoil.
                {o.product?.shelf_life_days && o.product.shelf_life_days <= 7 ? ` Shelf life is only ${o.product.shelf_life_days} days: leftovers may become waste.` : ""}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">MITRA needs more confirmed asks before suggesting a purchase. Keep logging when customers ask.</p>
          )}
        </section>
      </div>

      {explain && (
        <div className="rise rounded-xl border border-signal/30 bg-signal/5 p-3 text-sm">
          <p className="mb-1 text-xs text-signal">MITRA explains (AI, grounded on the numbers above)</p>
          <p className="whitespace-pre-wrap">{explain}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {canMoney && !o.open_trial_id && (
          <Button onClick={propose} loading={proposing}><FlaskConical className="size-4" /> Propose {qty}-unit trial</Button>
        )}
        {o.open_trial_id && <Link href="/app/trials" className="inline-flex h-10 items-center rounded-xl border border-signal/40 px-4 text-sm text-signal">View open trial</Link>}
        <Button variant="secondary" onClick={askWhy} loading={explaining}><MessageSquareText className="size-4" /> Explain in {lang === "ta" ? "Tamil" : "English"}</Button>
      </div>
    </div>
  );
}

function AddCost({ o, onSaved }: { o: Opportunity; onSaved: () => void }) {
  const { store, toast } = useApp();
  const [cost, setCost] = useState(o.product?.cost_price ?? "");
  const [price, setPrice] = useState(o.product?.sell_price ?? "");
  const [unit, setUnit] = useState(o.product?.unit ?? "piece");
  const [shelf, setShelf] = useState(o.product?.shelf_life_days ? String(o.product.shelf_life_days) : "");
  const [busy, setBusy] = useState(false);
  if (store?.role !== "owner") return <p className="text-sm text-muted">Ask the store owner to add this item’s buying and selling price.</p>;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { cost_price: cost, sell_price: price, unit, shelf_life_days: shelf ? Number(shelf) : null };
      if (o.product) await api(`/products/${o.product.id}`, { method: "PATCH", body });
      else await api("/products", { body: { name: titleCase(o.display_name), aliases: [o.item], ...body } });
      toast("Saved. MITRA can now check if it pays.");
      onSaved();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Could not save", "err");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save} className="space-y-3">
      <h3 className="text-sm font-semibold">Add cost & price to see if it pays</h3>
      <div className="grid grid-cols-2 gap-3">
        <Field label="You buy at (₹)"><Input required type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} /></Field>
        <Field label="You sell at (₹)"><Input required type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
        <Field label="Unit"><Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="bottle, pack, kg" /></Field>
        <Field label="Shelf life (days)" hint="Optional"><Input type="number" min="1" value={shelf} onChange={(e) => setShelf(e.target.value)} /></Field>
      </div>
      <Button type="submit" loading={busy}>Save and calculate</Button>
    </form>
  );
}
