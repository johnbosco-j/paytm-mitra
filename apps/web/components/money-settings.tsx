"use client";

import { useState } from "react";
import { Plus, Trash2, Wallet } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { rupees } from "@/lib/format";
import { useApiData } from "@/lib/useApiData";
import { useApp } from "./providers";
import { Button, Card, Field, Input, Select } from "./ui";

type Expense = { id: string; name: string; amount: string; cadence: string; next_due: string };
type StoreMoney = { cash_on_hand: string | null; avg_margin_pct: string | null; role: string };

const weekFromNow = () => new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);

/** Inputs for the cash runway: cash in hand, blended margin and known dues. Owner-editable. */
export function MoneySettings() {
  const { store, toast } = useApp();
  const owner = store?.role === "owner";
  const info = useApiData<StoreMoney>("/store", store?.id);
  const exps = useApiData<Expense[]>("/expenses", store?.id);
  const [cash, setCash] = useState<string | null>(null);
  const [margin, setMargin] = useState<string | null>(null);
  const [form, setForm] = useState(() => ({ name: "", amount: "", cadence: "monthly", next_due: weekFromNow() }));

  async function saveMoney() {
    try {
      await api("/store", { method: "PATCH", body: { cash_on_hand: cash ?? info.data?.cash_on_hand ?? null, avg_margin_pct: margin ?? info.data?.avg_margin_pct ?? null } });
      toast("Saved. Cash runway updated.");
      setCash(null);
      setMargin(null);
      void info.reload();
    } catch (e) {
      toast(e instanceof ApiError ? (e.details?.[0]?.message ?? e.message) : "Failed", "err");
    }
  }
  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/expenses", { body: { ...form, next_due: new Date(form.next_due + "T09:00:00+05:30").toISOString() } });
      setForm({ ...form, name: "", amount: "" });
      void exps.reload();
    } catch (err) {
      toast(err instanceof ApiError ? (err.details?.[0]?.message ?? err.message) : "Failed", "err");
    }
  }
  async function remove(id: string) {
    await api(`/expenses/${id}`, { method: "DELETE" }).catch(() => null);
    void exps.reload();
  }

  return (
    <Card>
      <p className="mb-1 flex items-center gap-2 text-[16px] font-bold text-navy"><Wallet className="size-5 text-signal" /> Money</p>
      <p className="mb-4 text-sm text-muted">Used only for your cash runway forecast. Stays private to your store.</p>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Cash in hand + bank (₹)"><Input type="number" min={0} disabled={!owner} className="w-40" value={cash ?? info.data?.cash_on_hand ?? ""} onChange={(e) => setCash(e.target.value)} /></Field>
        <Field label="Average margin (%)" hint="e.g. 15–20 for a kirana"><Input type="number" min={0} max={100} step="0.5" disabled={!owner} className="w-32" value={margin ?? info.data?.avg_margin_pct ?? ""} onChange={(e) => setMargin(e.target.value)} /></Field>
        {owner && (cash !== null || margin !== null) && <Button onClick={saveMoney}>Save</Button>}
      </div>
      <p className="mt-5 mb-2 text-sm font-semibold">Regular dues</p>
      <ul className="mb-3 divide-y divide-line text-sm">
        {exps.data?.map((x) => (
          <li key={x.id} className="flex items-center gap-3 py-2">
            <span className="flex-1">{x.name} <span className="text-faint">· {x.cadence} · next {new Date(x.next_due).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span></span>
            <span className="num font-semibold text-navy">{rupees(x.amount, true)}</span>
            {owner && <button aria-label={`Remove ${x.name}`} onClick={() => remove(x.id)} className="text-faint hover:text-risk"><Trash2 className="size-4" /></button>}
          </li>
        ))}
        {exps.data?.length === 0 && <li className="py-2 text-faint">No dues yet. Add rent, power, salaries.</li>}
      </ul>
      {owner && (
        <form onSubmit={addExpense} className="grid grid-cols-2 gap-2 md:grid-cols-5 md:items-end">
          <Field label="Name"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Shop rent" /></Field>
          <Field label="₹"><Input required type="number" min={1} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
          <Field label="Repeats">
            <Select value={form.cadence} onChange={(e) => setForm({ ...form, cadence: e.target.value })}><option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="once">Once</option></Select>
          </Field>
          <Field label="Next due"><Input type="date" value={form.next_due} onChange={(e) => setForm({ ...form, next_due: e.target.value })} /></Field>
          <Button type="submit"><Plus className="size-4" /> Add</Button>
        </form>
      )}
    </Card>
  );
}
