"use client";

import { useRef, useState } from "react";
import { Delete, FileUp, IndianRupee, Upload } from "lucide-react";
import { useApp } from "@/components/providers";
import { Badge, Button, Card, ErrorNote, PageHeader, Spinner, cx } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { rupees } from "@/lib/format";
import { useApiData } from "@/lib/useApiData";

type Summary = { count: number; total: number; series: { date: string; amount: number }[]; by_method: Record<string, number>; sources: string[] };
type ImportRes = { dry_run: boolean; imported: number; duplicates: number; skipped: number; errors: string[]; columns: Record<string, string>; preview: { date: string; amount: string; method: string; payer: string | null }[] };

export default function SalesPage() {
  const { store, toast } = useApp();
  const sum = useApiData<Summary>("/sales/summary?days=30", store?.id);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "upi" | "card">("cash");
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportRes | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const owner = store?.role === "owner";

  const press = (k: string) => setAmount((a) => (k === "del" ? a.slice(0, -1) : (a + k).replace(/^0+(?=\d)/, "").slice(0, 7)));

  async function addSale() {
    if (!Number(amount)) return;
    setBusy(true);
    try {
      await api("/sales", { body: { amount, method } });
      toast(`₹${amount} ${method} sale recorded`);
      setAmount("");
      void sum.reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Failed", "err");
    } finally {
      setBusy(false);
    }
  }

  async function runImport(dry: boolean) {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("dry_run", String(dry));
      const r = await api<ImportRes>("/sales/import", { form: fd });
      if (dry) setPreview(r);
      else {
        toast(`Imported ${r.imported} sales (${r.duplicates} already there)`);
        setPreview(null);
        setFile(null);
        void sum.reload();
      }
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Import failed", "err");
    } finally {
      setBusy(false);
    }
  }

  const max = Math.max(1, ...(sum.data?.series.map((s) => s.amount) ?? [1]));
  return (
    <div className="rise space-y-5">
      <PageHeader title="Sales" sub="What did sell. Together with what didn't, MITRA can forecast, plan cash and spot regulars drifting away." />
      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <Card className="bg-gradient-to-b from-white to-[#f5faff]">
          <p className="mb-3 text-[16px] font-bold text-navy">Quick sale</p>
          <div className="mb-3 flex items-center justify-center gap-1 rounded-2xl bg-white py-4 shadow-inner">
            <IndianRupee className="size-7 text-navy" />
            <span className="num font-display text-5xl font-black text-navy">{amount || "0"}</span>
          </div>
          <div className="mb-3 grid grid-cols-3 gap-2">
            {(["cash", "upi", "card"] as const).map((m) => (
              <button key={m} onClick={() => setMethod(m)} className={cx("rounded-xl border py-2 text-sm font-bold uppercase", method === m ? "border-signal bg-[#e6f6fd] text-navy" : "border-line text-muted")}>{m}</button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "del"].map((k) => (
              <button key={k} onClick={() => press(k)} aria-label={k === "del" ? "Delete digit" : k}
                className="grid h-14 place-items-center rounded-2xl bg-white text-xl font-bold text-navy shadow-sm transition active:scale-95 hover:bg-[#eef6fd]">
                {k === "del" ? <Delete className="size-5" /> : k}
              </button>
            ))}
          </div>
          <Button className="mt-3 w-full" size="lg" onClick={addSale} loading={busy} disabled={!Number(amount)}>Record sale</Button>
        </Card>

        <div className="space-y-5">
          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[16px] font-bold text-navy">Last 30 days</p>
              {sum.data?.sources.includes("sample_seed") && <Badge tone="caution">includes SAMPLE sales</Badge>}
            </div>
            {sum.loading && !sum.data ? <Spinner /> : sum.error ? <ErrorNote message={sum.error} onRetry={sum.reload} /> : sum.data && (
              <>
                <div className="flex flex-wrap gap-6">
                  <div><p className="text-xs text-muted">Total</p><p className="num text-3xl font-black text-navy">{rupees(String(sum.data.total), true)}</p></div>
                  <div><p className="text-xs text-muted">Bills</p><p className="num text-3xl font-black text-navy">{sum.data.count}</p></div>
                  {Object.entries(sum.data.by_method).map(([k, v]) => (
                    <div key={k}><p className="text-xs uppercase text-muted">{k}</p><p className="num text-xl font-bold text-[#2d3748]">{rupees(String(v), true)}</p></div>
                  ))}
                </div>
                <div className="mt-4 flex h-28 items-end gap-1" role="img" aria-label="Sales per day, last 30 days">
                  {sum.data.series.slice(-30).map((s) => (
                    <div key={s.date} title={`${s.date}: ₹${s.amount}`} className="flex-1 rounded-t bg-signal/80 hover:bg-navy" style={{ height: `${Math.max(2, (s.amount / max) * 100)}%` }} />
                  ))}
                </div>
              </>
            )}
          </Card>

          <Card>
            <p className="mb-1 flex items-center gap-2 text-[16px] font-bold text-navy"><FileUp className="size-5 text-signal" /> Import Paytm statement</p>
            <p className="mb-3 text-sm text-muted">Download your transaction statement (CSV) from Paytm for Business and drop it here. Customers’ UPI IDs are hashed; MITRA never stores them.</p>
            {!owner ? <p className="text-sm text-faint">Only the owner can import statements.</p> : (
              <>
                <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPreview(null); }} />
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="secondary" onClick={() => inputRef.current?.click()}><Upload className="size-4" /> {file ? file.name : "Choose CSV"}</Button>
                  <Button onClick={() => runImport(true)} disabled={!file} loading={busy && !preview}>Preview</Button>
                  {preview && <Button variant="success" onClick={() => runImport(false)} loading={busy}>Import {preview.imported} sales</Button>}
                </div>
                {preview && (
                  <div className="rise mt-4 rounded-2xl bg-[#f5f8fc] p-4 text-sm">
                    <p className="font-semibold text-navy">{preview.imported} new · {preview.duplicates} already imported · {preview.skipped} skipped (failed or unreadable)</p>
                    <p className="mt-1 text-xs text-muted">Columns found: {Object.entries(preview.columns).map(([k, v]) => `${k} → “${v}”`).join(", ")}</p>
                    <ul className="mt-2 space-y-1 text-xs">{preview.preview.map((p, i) => <li key={i} className="num">{p.date.slice(0, 16).replace("T", " ")} · ₹{p.amount} · {p.method}{p.payer ? " · payer hashed" : ""}</li>)}</ul>
                    {preview.errors.length > 0 && <p className="mt-2 text-xs text-risk">{preview.errors.join("; ")}</p>}
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
