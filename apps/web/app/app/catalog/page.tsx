"use client";

import { useState } from "react";
import { Package, Plus } from "lucide-react";
import { useApp } from "@/components/providers";
import { Badge, Button, Card, Empty, ErrorNote, Field, Input, PageHeader, Spinner } from "@/components/ui";
import { api, ApiError, type Product } from "@/lib/api";
import { rupees } from "@/lib/format";
import { useApiData } from "@/lib/useApiData";

const blank = { name: "", aliases: "", unit: "piece", cost_price: "", sell_price: "", stock_qty: "0", shelf_life_days: "", supplier_name: "" };

export default function CatalogPage() {
  const { store, toast } = useApp();
  const { data, error, loading, reload } = useApiData<Product[]>("/products", store?.id);
  const [form, setForm] = useState(blank);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const owner = store?.role === "owner";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api("/products", {
        body: {
          name: form.name,
          aliases: form.aliases.split(",").map((a) => a.trim()).filter(Boolean),
          unit: form.unit || "piece",
          cost_price: form.cost_price || null,
          sell_price: form.sell_price || null,
          stock_qty: Number(form.stock_qty) || 0,
          shelf_life_days: form.shelf_life_days ? Number(form.shelf_life_days) : null,
          supplier_name: form.supplier_name || null,
        },
      });
      toast(`${form.name} added`);
      setForm(blank);
      setShow(false);
      void reload();
    } catch (e) {
      setErr(e instanceof ApiError ? (e.details?.[0] ? `${e.details[0].field}: ${e.details[0].message}` : e.message) : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function adjust(p: Product, delta: number) {
    try {
      await api(`/products/${p.id}/adjust`, { body: { qty_delta: delta, kind: delta < 0 ? "sale" : "adjustment" } });
      void reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Failed", "err");
    }
  }

  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="rise space-y-6">
      <PageHeader
        title="Catalog"
        sub="Buying and selling prices let MITRA check whether an item actually pays. Stock changes are recorded in a ledger."
        right={owner && <Button onClick={() => setShow((s) => !s)}><Plus className="size-4" /> Add product</Button>}
      />
      {show && owner && (
        <Card className="rise">
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2"><Field label="Product name"><Input required value={form.name} onChange={set("name")} placeholder="Mango Lassi 200ml" /></Field></div>
            <div className="md:col-span-2"><Field label="Other names customers use" hint="Comma separated, any language"><Input value={form.aliases} onChange={set("aliases")} placeholder="lassi, மாம்பழ லஸ்ஸி" /></Field></div>
            <Field label="Buy price (₹)"><Input type="number" min="0" step="0.01" value={form.cost_price} onChange={set("cost_price")} /></Field>
            <Field label="Sell price (₹)"><Input type="number" min="0" step="0.01" value={form.sell_price} onChange={set("sell_price")} /></Field>
            <Field label="Unit"><Input value={form.unit} onChange={set("unit")} /></Field>
            <Field label="In stock now"><Input type="number" min="0" value={form.stock_qty} onChange={set("stock_qty")} /></Field>
            <Field label="Shelf life (days)" hint="Optional"><Input type="number" min="1" value={form.shelf_life_days} onChange={set("shelf_life_days")} /></Field>
            <div className="md:col-span-2"><Field label="Supplier" hint="Optional"><Input value={form.supplier_name} onChange={set("supplier_name")} /></Field></div>
            <div className="flex items-end"><Button type="submit" loading={busy} className="w-full">Save</Button></div>
            {err && <p role="alert" className="text-sm text-risk md:col-span-4">{err}</p>}
          </form>
        </Card>
      )}
      {loading && !data ? (
        <Spinner />
      ) : error ? (
        <ErrorNote message={error} onRetry={reload} />
      ) : !data?.length ? (
        <Empty icon={<Package className="size-6" />} title="No products yet" body="Add the items you sell, with buying and selling price. You can also add an item later, straight from an opportunity." />
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-line">
            {data.map((p) => {
              const m = p.cost_price && p.sell_price && Number(p.sell_price) > 0 ? ((Number(p.sell_price) - Number(p.cost_price)) / Number(p.sell_price)) * 100 : null;
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{p.name} {p.source_type === "sample_seed" && <Badge tone="caution" className="ml-1">SAMPLE</Badge>}</p>
                    <p className="truncate text-xs text-faint">{p.aliases.join(", ") || "no aliases"}{p.supplier_name ? ` · ${p.supplier_name}` : ""}</p>
                  </div>
                  <span className="num text-muted">{rupees(p.cost_price)} → {rupees(p.sell_price)}</span>
                  {m !== null ? <Badge tone={m > 0 ? "success" : "risk"}>{m.toFixed(1)}% margin</Badge> : <Badge tone="caution">no cost</Badge>}
                  <div className="flex items-center gap-1">
                    <button aria-label={`Remove one ${p.name} from stock`} onClick={() => adjust(p, -1)} disabled={p.stock_qty === 0} className="size-7 rounded-lg border border-line disabled:opacity-30">−</button>
                    <span className="num w-14 text-center">{p.stock_qty} <span className="text-[10px] text-faint">{p.unit}</span></span>
                    <button aria-label={`Add one ${p.name} to stock`} onClick={() => adjust(p, 1)} className="size-7 rounded-lg border border-line">+</button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
