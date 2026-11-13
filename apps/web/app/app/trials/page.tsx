"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Check, Copy, FlaskConical, MessageCircle, ShieldCheck, X } from "lucide-react";
import { useApp } from "@/components/providers";
import { Badge, Button, Card, Empty, ErrorNote, Field, Input, PageHeader, Spinner, cx } from "@/components/ui";
import { api, ApiError, newKey, type Trial } from "@/lib/api";
import { rupees, shortDate, titleCase } from "@/lib/format";
import { useApiData } from "@/lib/useApiData";

const STEPS = ["pending_approval", "approved", "active", "completed"] as const;
const STEP_LABEL = { pending_approval: "Proposed", approved: "Approved", active: "Stocked", completed: "Result" };

export default function TrialsPage() {
  const { store } = useApp();
  const { data, error, loading, reload } = useApiData<Trial[]>("/trials", store?.id);
  return (
    <div className="rise space-y-6">
      <PageHeader title="Trials" sub="Small, reversible stocking experiments. Only the owner approves spending; results come from what you record." />
      {loading && !data ? (
        <Spinner />
      ) : error ? (
        <ErrorNote message={error} onRetry={reload} />
      ) : !data?.length ? (
        <Empty icon={<FlaskConical className="size-6" />} title="No trials yet" body="Propose one from a ready opportunity." action={<Link className="text-signal underline" href="/app/opportunities">See opportunities</Link>} />
      ) : (
        <ul className="space-y-4">{data.map((t) => <TrialCard key={t.id} t={t} onChange={reload} />)}</ul>
      )}
    </div>
  );
}

function Timeline({ status }: { status: Trial["status"] }) {
  if (status === "rejected" || status === "cancelled") return <Badge tone="risk">{status}</Badge>;
  const idx = STEPS.indexOf(status as (typeof STEPS)[number]);
  return (
    <ol className="flex items-center gap-1.5 text-[11px]" aria-label="Trial progress">
      {STEPS.map((s, i) => (
        <li key={s} className="flex items-center gap-1.5">
          <span className={cx("rounded-full px-2 py-0.5", i < idx ? "bg-success/15 text-success" : i === idx ? "bg-signal/15 text-signal" : "bg-raised text-faint")} aria-current={i === idx ? "step" : undefined}>
            {STEP_LABEL[s]}
          </span>
          {i < STEPS.length - 1 && <span className="h-px w-3 bg-line" />}
        </li>
      ))}
    </ol>
  );
}

function TrialCard({ t, onChange }: { t: Trial; onChange: () => void }) {
  return (
    <li>
      <Card className={cx(t.status === "pending_approval" && "border-caution/40")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold">{titleCase(t.product_name)}</p>
            <p className="text-sm text-muted">
              <span className="num">{t.proposed_qty}</span> {t.unit} · buy {rupees(t.unit_cost)} · sell {rupees(t.unit_price)} · planned outlay <b className="num text-ink">{rupees(t.planned_outlay)}</b>
            </p>
            <p className="mt-0.5 text-xs text-faint">
              Proposed by {t.proposed_by} · {shortDate(t.created_at)}
              {t.decided_by && ` · ${t.status === "rejected" ? "rejected" : "approved"} by ${t.decided_by}`}
              {t.snapshot.owner_edited_qty_from ? ` · owner changed qty from ${t.snapshot.owner_edited_qty_from}` : ""}
            </p>
          </div>
          <Timeline status={t.status} />
        </div>
        <div className="mt-4">
          {t.status === "pending_approval" && <Approval t={t} onChange={onChange} />}
          {t.status === "approved" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <SupplierDraft t={t} />
              <Receive t={t} onChange={onChange} />
            </div>
          )}
          {t.status === "active" && <Outcome t={t} onChange={onChange} />}
          {t.status === "completed" && t.result && <Result t={t} />}
          {(t.status === "rejected" || t.status === "cancelled") && t.decision_note && <p className="text-sm text-muted">Note: {t.decision_note}</p>}
        </div>
      </Card>
    </li>
  );
}

function Approval({ t, onChange }: { t: Trial; onChange: () => void }) {
  const { store, toast } = useApp();
  const [qty, setQty] = useState(t.proposed_qty);
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const owner = store?.role === "owner";
  async function decide(kind: "approve" | "reject") {
    setBusy(kind);
    try {
      await api(`/trials/${t.id}/${kind}`, { body: kind === "approve" ? { quantity: qty } : { note: "Not now" } });
      toast(kind === "approve" ? "Approved. Nothing has been ordered or sent yet." : "Trial rejected.");
      onChange();
    } catch (e) {
      toast(e instanceof ApiError ? `${e.message} (${e.status} ${e.code})` : "Failed", "err");
    } finally {
      setBusy(null);
    }
  }
  const sc = t.snapshot.scenarios ?? [];
  return (
    <div className="space-y-3 rounded-xl border border-line bg-canvas p-4">
      <p className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="size-4 text-caution" /> Owner approval needed before any money is spent</p>
      {sc.length > 0 && (
        <p className="text-sm text-muted">
          If {sc[0].units_sold}–{sc[sc.length - 1].units_sold} sell: gross profit <span className="num text-success">{rupees(sc[0].gross_profit)}–{rupees(sc[sc.length - 1].gross_profit)}</span>.
          Worst case nothing sells: {rupees(t.planned_outlay)} tied up in stock.
        </p>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Quantity to approve">
          <Input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} className="w-28" disabled={!owner} />
        </Field>
        <Button variant="success" onClick={() => decide("approve")} loading={busy === "approve"}><Check className="size-4" /> Approve</Button>
        <Button variant="danger" onClick={() => decide("reject")} loading={busy === "reject"}><X className="size-4" /> Reject</Button>
      </div>
      {!owner && <p className="text-xs text-caution">You are signed in as staff. The server will refuse approval; only the owner can approve spending.</p>}
    </div>
  );
}

function SupplierDraft({ t }: { t: Trial }) {
  const { store, toast } = useApp();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function draft(language: "ta" | "en") {
    setBusy(true);
    try {
      const r = await api<{ text: string }>(`/trials/${t.id}/supplier-message`, { body: { language } });
      setMsg(r.text);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Could not draft", "err");
    } finally {
      setBusy(false);
    }
  }
  if (store?.role !== "owner") return <p className="text-sm text-muted">The owner contacts the supplier.</p>;
  return (
    <div className="space-y-3 rounded-xl border border-line bg-canvas p-4">
      <p className="text-sm font-medium">Ask your supplier for a quote</p>
      {!msg ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => draft("ta")} loading={busy}><MessageCircle className="size-4" /> Draft in Tamil</Button>
          <Button variant="ghost" onClick={() => draft("en")} disabled={busy}>English</Button>
        </div>
      ) : (
        <>
          <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={4} className="w-full rounded-xl border border-line bg-surface p-3 text-sm" aria-label="Supplier message" />
          <div className="flex flex-wrap gap-2">
            <a href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 rounded-xl bg-success px-3 text-sm font-semibold text-white">
              <MessageCircle className="size-4" /> Open in WhatsApp
            </a>
            <Button size="sm" variant="secondary" onClick={() => { void navigator.clipboard?.writeText(msg); toast("Copied"); }}><Copy className="size-4" /> Copy</Button>
          </div>
          <p className="text-[11px] text-faint">MITRA never sends messages. You choose the contact and press send yourself.</p>
        </>
      )}
    </div>
  );
}

function Receive({ t, onChange }: { t: Trial; onChange: () => void }) {
  const { toast } = useApp();
  const [qty, setQty] = useState(String(t.proposed_qty));
  const [cost, setCost] = useState(t.unit_cost);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/trials/${t.id}/receive`, { body: { received_qty: Number(qty), unit_cost: cost } });
      toast("Stock recorded in the ledger.");
      onChange();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Failed", "err");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-line bg-canvas p-4">
      <p className="text-sm font-medium">When the stock arrives</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Units received"><Input required type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
        <Field label="Actual cost per unit (₹)"><Input required type="number" min={0} step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} /></Field>
      </div>
      <Button type="submit" loading={busy}>Record stock received</Button>
    </form>
  );
}

function Outcome({ t, onChange }: { t: Trial; onChange: () => void }) {
  const { toast, celebrate } = useApp();
  const [sold, setSold] = useState("");
  const [wasted, setWasted] = useState("0");
  const [price, setPrice] = useState(t.unit_price);
  const [busy, setBusy] = useState(false);
  const key = useRef(newKey());
  const over = Number(sold) + Number(wasted) > (t.received_qty ?? 0);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/trials/${t.id}/outcome`, { idempotencyKey: key.current, body: { sold_qty: Number(sold), wasted_qty: Number(wasted), unit_price: price } });
      const soldN = Number(sold), recv = t.received_qty ?? 0;
      if (recv > 0 && soldN / recv >= 0.6) celebrate(`${soldN} of ${recv} sold!`, "Your customers asked, you listened, and it worked. Proof is now in your ledger.");
      else toast("Result recorded. Every trial teaches MITRA what your street wants.");
      onChange();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Failed", "err");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-line bg-canvas p-4">
      <p className="text-sm font-medium">{t.received_qty} {t.unit} received at {rupees(t.actual_unit_cost)}. How did it go?</p>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Sold"><Input required type="number" min={0} value={sold} onChange={(e) => setSold(e.target.value)} /></Field>
        <Field label="Wasted / spoiled"><Input type="number" min={0} value={wasted} onChange={(e) => setWasted(e.target.value)} /></Field>
        <Field label="Sold at (₹/unit)"><Input required type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
      </div>
      {over && <p className="text-xs text-risk">Sold + wasted can’t be more than {t.received_qty} received.</p>}
      <Button type="submit" variant="success" loading={busy} disabled={over || sold === ""}>Record results</Button>
    </form>
  );
}

function Result({ t }: { t: Trial }) {
  const r = t.result!;
  const sc = t.snapshot.scenarios ?? [];
  const predicted = sc.find((s) => s.label === "likely") ?? sc[1] ?? sc[0];
  const rows: [string, string, string, string?][] = [
    ["Revenue", r.revenue, "money in from units sold"],
    ["Cost of goods sold", r.cogs, "sold × cost"],
    ["Gross profit", r.gross_profit, "before rent, staff, transport", "success"],
    ["Waste written off", r.waste_writeoff, `${r.wasted_qty} unit(s)`],
    ["Purchase outlay", r.purchase_outlay, `${r.received_qty} bought`],
    ["Cash vs outlay", r.cash_difference, "not profit: leftover stock still has value"],
    ["Leftover stock value", r.leftover_value, `${r.leftover_qty} unit(s) at cost`],
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="rounded-xl border border-success/30 bg-success/5 p-4">
        <p className="mb-3 text-sm font-medium">{r.sold_qty} of {r.received_qty} sold · {r.sell_through_pct}% sell-through</p>
        <dl className="num grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-sm">
          {rows.map(([k, v, hint, tone]) => (
            <div key={k} className="contents">
              <dt className="text-muted">{k} <span className="text-[11px] text-faint">· {hint}</span></dt>
              <dd className={cx("text-right font-medium", tone === "success" && "text-success text-base")}>{rupees(v)}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="rounded-xl border border-line bg-canvas p-4 text-sm">
        <p className="mb-2 font-medium">Predicted vs what happened</p>
        {predicted ? (
          <dl className="num grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1">
            <dt className="text-faint" />
            <dd className="text-xs text-faint">predicted</dd>
            <dd className="text-xs text-faint">actual</dd>
            <dt className="text-muted">Units sold</dt><dd>{predicted.units_sold}</dd><dd className="font-semibold">{r.sold_qty}</dd>
            <dt className="text-muted">Gross profit</dt><dd>{rupees(predicted.gross_profit)}</dd><dd className="font-semibold">{rupees(r.gross_profit)}</dd>
          </dl>
        ) : (
          <p className="text-muted">No prediction snapshot.</p>
        )}
        <p className="mt-3 text-[11px] text-faint">One trial is a single observation, not proof of a trend. Repeat before scaling up.</p>
      </div>
    </div>
  );
}
