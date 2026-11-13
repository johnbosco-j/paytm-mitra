"use client";

import { useRef, useState } from "react";
import { Camera, Check, ScanLine, Sparkles } from "lucide-react";
import { useApp } from "@/components/providers";
import { Badge, Button, Card, Empty, PageHeader, cx } from "@/components/ui";
import { api, ApiError, newKey } from "@/lib/api";
import { titleCase } from "@/lib/format";

type Scan = { products: { name: string; fill: "full" | "low" | "empty"; count_estimate: number | null; product_id: string | null; product_name: string | null; stock_qty: number | null }[]; empty_slots: number; summary: string; model: string };

export default function ShelfPage() {
  const { toast } = useApp();
  const [img, setImg] = useState<string | null>(null);
  const [scan, setScan] = useState<Scan | null>(null);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [err, setErr] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function onFile(f: File | undefined) {
    if (!f) return;
    setImg(URL.createObjectURL(f));
    setScan(null);
    setErr(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("image", f);
      const r = await api<Scan>("/shelf/scan", { form: fd });
      setScan(r);
      setPicked(new Set(r.products.filter((p) => p.fill !== "full").map((p) => p.name)));
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Scan failed");
    } finally {
      setBusy(false);
    }
  }

  async function logPicked() {
    if (!scan || picked.size === 0) return;
    try {
      await api("/demand", {
        idempotencyKey: newKey(),
        body: {
          items: scan.products.filter((p) => picked.has(p.name)).map((p) => ({ raw_item: p.name, normalized_item: p.product_name ?? p.name, ask_count: 1, reason: "out_of_stock", product_id: p.product_id, notes: `shelf scan: ${p.fill}` })),
          extractor: scan.model.startsWith("gemini") ? `${scan.model}+vision` : scan.model,
        },
      });
      toast(`${picked.size} low/empty items added to your demand ledger`);
      setPicked(new Set());
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Failed", "err");
    }
  }

  const tone = { full: "success", low: "caution", empty: "risk" } as const;
  return (
    <div className="rise space-y-5">
      <PageHeader title="Shelf scanner" sub="Snap your shelf. MITRA spots what's running low or empty before a customer has to hear “illa”." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          {img ? (
            <div className="relative overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="Your shelf photo" className="w-full object-cover" />
              {busy && (
                <div className="absolute inset-0 grid place-items-center bg-[#002e6e]/35">
                  <div className="absolute inset-x-0 h-1 animate-[scan_1.6s_ease-in-out_infinite] bg-[#00baf2] shadow-[0_0_24px_#00baf2]" />
                  <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-navy">Reading your shelf…</span>
                </div>
              )}
            </div>
          ) : (
            <Empty icon={<ScanLine className="size-8" />} title="Take a photo of one shelf" body="Stand back so the whole rack fits. Works best in good light." />
          )}
          <Button className="mt-4 w-full" size="lg" onClick={() => input.current?.click()} loading={busy}><Camera className="size-5" /> {img ? "Scan another shelf" : "Open camera"}</Button>
          <p className="mt-2 text-[11px] text-faint">Photos are sent to the cloud AI for reading and are not stored by MITRA.</p>
        </Card>
        <Card>
          {err && <p className="mb-3 rounded-xl bg-[#fdeeee] p-3 text-sm text-[#b4161b]">{err}</p>}
          {!scan ? (
            <Empty icon={<Sparkles className="size-7" />} title="Results appear here" body="Each product gets full, low or empty. You decide what goes into your demand ledger." />
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[16px] font-bold text-navy">{scan.products.length} products · {scan.empty_slots} empty gaps</p>
                <Badge tone="signal">read by {scan.model}</Badge>
              </div>
              <p className="mb-3 text-sm text-muted">{scan.summary}</p>
              <ul className="space-y-2">
                {scan.products.map((p) => (
                  <li key={p.name}>
                    <label className={cx("flex cursor-pointer items-center gap-3 rounded-xl border p-3", picked.has(p.name) ? "border-signal bg-[#f0faff]" : "border-line")}>
                      <input type="checkbox" checked={picked.has(p.name)} onChange={() => setPicked((s) => { const n = new Set(s); if (n.has(p.name)) n.delete(p.name); else n.add(p.name); return n; })} className="accent-[#00baf2]" />
                      <span className="flex-1 text-sm font-semibold">{titleCase(p.name)}{p.product_name && <span className="ml-1 text-xs font-normal text-faint">· your {p.product_name}{p.stock_qty !== null ? ` (${p.stock_qty} in stock)` : ""}</span>}</span>
                      <Badge tone={tone[p.fill]}>{p.fill}</Badge>
                    </label>
                  </li>
                ))}
              </ul>
              <Button className="mt-4 w-full" variant="success" onClick={logPicked} disabled={picked.size === 0}><Check className="size-4" /> Log {picked.size} as running out</Button>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
