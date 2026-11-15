"use client";

import Link from "next/link";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { Check, Copy, Link2, MessageCircle, QrCode, RefreshCw, ShoppingBag, Wallet, X } from "lucide-react";
import { useApp } from "@/components/providers";
import { Badge, Button, Card, Empty, ErrorNote, Field, Input, PageHeader, Spinner, cx } from "@/components/ui";
import { api, ApiError, newKey, type Product } from "@/lib/api";
import { rupees, shortDate, titleCase } from "@/lib/format";
import { useApiData } from "@/lib/useApiData";

type PreOrder = {
  id: string; item: string; quantity: number; amount: string; customer_name: string; phone: string | null; method: "paytm_link" | "upi_qr" | "cash";
  status: "awaiting_payment" | "paid" | "fulfilled" | "cancelled"; pay_url: string | null; order_ref: string; created_at: string;
};
type Integrations = { paytm_links: { connected: boolean }; upi_qr: { configured: boolean; vpa: string | null } };

const STATUS = {
  awaiting_payment: { label: "Awaiting payment", tone: "caution" as const },
  paid: { label: "Paid", tone: "success" as const },
  fulfilled: { label: "Handed over", tone: "signal" as const },
  cancelled: { label: "Cancelled", tone: "neutral" as const },
};

function UpiQr({ uri }: { uri: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) void QRCode.toCanvas(ref.current, uri, { width: 220, margin: 1, color: { dark: "#002e6e", light: "#ffffff" } });
  }, [uri]);
  return <canvas ref={ref} className="mx-auto rounded-xl" aria-label="UPI payment QR code" />;
}

export default function PreordersPage() {
  const { store, toast, celebrate } = useApp();
  const list = useApiData<PreOrder[]>("/preorders", store?.id);
  const products = useApiData<Product[]>("/products", store?.id);
  const integ = useApiData<Integrations>("/integrations", store?.id);
  const [form, setForm] = useState({ item: "", quantity: "1", customer_name: "", phone: "", consent: false, method: "upi_qr" as PreOrder["method"], unit_price: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [show, setShow] = useState<PreOrder | null>(null);
  const key = useRef(newKey());

  const paytmOn = !!integ.data?.paytm_links.connected;
  const upiOn = !!integ.data?.upi_qr.configured;
  // never submit a payment method that isn't available on this shop
  const method: PreOrder["method"] = (form.method === "upi_qr" && !upiOn) || (form.method === "paytm_link" && !paytmOn) ? "cash" : form.method;
  const product = products.data?.find((p) => p.name.toLowerCase() === form.item.toLowerCase() || p.aliases.some((a) => a.toLowerCase() === form.item.toLowerCase()));
  const price = product?.sell_price ?? (form.unit_price || null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const p = await api<PreOrder>("/preorders", {
        idempotencyKey: key.current,
        body: {
          item: form.item, product_id: product?.id ?? null, quantity: Number(form.quantity), customer_name: form.customer_name,
          phone: form.phone || null, consent_contact: form.consent, method, unit_price: product ? null : form.unit_price || null,
        },
      });
      key.current = newKey();
      toast("Pre-order created");
      setForm({ ...form, customer_name: "", phone: "", consent: false });
      if (p.pay_url) setShow(p);
      void list.reload();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? (e2.details?.[0] ? e2.details[0].message : e2.message) : "Could not create.");
    } finally {
      setBusy(false);
    }
  }

  async function act(p: PreOrder, status: "paid" | "fulfilled" | "cancelled") {
    try {
      await api(`/preorders/${p.id}/status`, { body: { status } });
      if (status === "paid") celebrate(`₹${p.amount} received`, "A customer paid before the stock even arrived.");
      if (status === "fulfilled") toast("Handed over. Happy customer!");
      void list.reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Failed", "err");
    }
  }
  async function sync(p: PreOrder) {
    try {
      const r = await api<PreOrder>(`/preorders/${p.id}/sync`, { method: "POST" });
      if (r.status === "paid") celebrate(`₹${p.amount} received`, "Paytm confirmed the payment.");
      else toast("Not paid yet");
      void list.reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Failed", "err");
    }
  }


  return (
    <div className="rise space-y-6">
      <PageHeader title="Pre-orders" sub="A customer asked for something you don't have yet? Reserve it for them, and take payment in advance if they want." />

      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <h2 className="mb-4 text-[16px] font-bold text-navy">New pre-order</h2>
          <form onSubmit={submit} className="space-y-3">
            <Field label="Item" hint={product ? `${product.name} · ${rupees(product.sell_price)} each` : "Pick from your catalog or type a name"}>
              <Input required list="items" value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} placeholder="Mango Lassi 200ml" />
              <datalist id="items">{products.data?.map((p) => <option key={p.id} value={p.name} />)}</datalist>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Quantity"><Input required type="number" min={1} max={500} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></Field>
              {!product ? (
                <Field label="Price each (₹)"><Input required type="number" min={0} step="0.01" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} /></Field>
              ) : (
                <Field label="Amount">
                  <p className="num rounded-xl bg-[#f5f8fc] px-3 py-2.5 text-sm font-bold text-navy">{price ? rupees(String(Number(price) * Number(form.quantity || 0))) : "—"}</p>
                </Field>
              )}
            </div>
            <Field label="Customer name"><Input required maxLength={80} value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></Field>
            <Field label="Mobile (optional)" hint="Stored encrypted. Only the owner can view it.">
              <Input inputMode="tel" maxLength={16} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="98400 12345" />
            </Field>
            {form.phone && (
              <label className="flex items-start gap-2 rounded-xl bg-[#f5f8fc] p-3 text-xs text-muted">
                <input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} className="mt-0.5 accent-[#00baf2]" />
                The customer agreed that I can save their number and message them about this order.
              </label>
            )}
            <div>
              <p className="mb-1.5 text-sm font-medium">Payment</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { m: "paytm_link", label: "Paytm link", icon: Link2, on: paytmOn, off: "Not connected" },
                  { m: "upi_qr", label: "UPI QR", icon: QrCode, on: upiOn, off: "Add UPI ID" },
                  { m: "cash", label: "Pay later", icon: Wallet, on: true, off: "" },
                ] as const).map(({ m, label, icon: Icon, on, off }) => (
                  <button key={m} type="button" disabled={!on} onClick={() => setForm({ ...form, method: m })}
                    className={cx("rounded-2xl border p-3 text-center text-xs font-semibold transition", method === m ? "border-signal bg-[#e6f6fd] text-navy" : "border-line text-[#4a5568]", !on && "opacity-50")}>
                    <Icon className="mx-auto mb-1 size-5" /> {label}
                    {!on && <span className="mt-0.5 block text-[10px] font-normal text-faint">{off}</span>}
                  </button>
                ))}
              </div>
              {!upiOn && <p className="mt-2 text-xs text-faint">Add your shop&apos;s UPI ID in <Link href="/app/team#settings" className="font-semibold text-signal">Settings</Link> to show a payment QR.</p>}
            </div>
            {err && <p role="alert" className="text-sm text-risk">{err}</p>}
            <Button type="submit" loading={busy} className="w-full" size="lg"><ShoppingBag className="size-4" /> Create pre-order</Button>
          </form>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[16px] font-bold text-navy">Pre-orders</h2>
            <Button size="sm" variant="ghost" onClick={() => list.reload()}><RefreshCw className="size-4" /></Button>
          </div>
          {list.loading && !list.data ? <Spinner /> : list.error ? <ErrorNote message={list.error} onRetry={list.reload} /> : !list.data?.length ? (
            <Empty icon={<ShoppingBag className="size-6" />} title="No pre-orders yet" body="When an item is missing, reserve it for the customer instead of saying “illa”." />
          ) : (
            <ul className="divide-y divide-line">
              {list.data.map((p) => (
                <li key={p.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="flex-1 font-semibold">{p.quantity} × {titleCase(p.item)} <span className="num font-bold text-navy">· {rupees(p.amount)}</span></p>
                    <Badge tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-faint">{p.customer_name}{p.phone ? ` · ${p.phone}` : ""} · {p.method.replace("_", " ")} · {p.order_ref} · {shortDate(p.created_at)}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {p.pay_url && p.status === "awaiting_payment" && <Button size="sm" variant="secondary" onClick={() => setShow(p)}><QrCode className="size-3.5" /> Show payment</Button>}
                    {p.method === "paytm_link" && p.status === "awaiting_payment" && <Button size="sm" variant="secondary" onClick={() => sync(p)}><RefreshCw className="size-3.5" /> Check Paytm</Button>}
                    {p.status === "awaiting_payment" && <Button size="sm" variant="secondary" onClick={() => act(p, "paid")}><Check className="size-3.5" /> Mark paid</Button>}
                    {(p.status === "paid" || p.status === "awaiting_payment") && <Button size="sm" variant="secondary" onClick={() => act(p, "fulfilled")}>Handed over</Button>}
                    {(p.status === "paid" || p.status === "awaiting_payment") && <Button size="sm" variant="ghost" onClick={() => act(p, "cancelled")}><X className="size-3.5" /> Cancel</Button>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {show?.pay_url && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#0b1f3a]/50 p-4" role="dialog" aria-modal="true" aria-label="Payment" onClick={() => setShow(null)}>
          <div className="rise w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs font-bold tracking-wide text-signal uppercase">{show.method === "upi_qr" ? "Scan with any UPI app" : "Paytm payment link"}</p>
            <p className="mt-1 text-lg font-bold text-navy">{show.quantity} × {titleCase(show.item)}</p>
            <p className="num text-3xl font-black text-navy">{rupees(show.amount)}</p>
            <div className="my-4">
              {show.method === "upi_qr" ? <UpiQr uri={show.pay_url} /> : show.pay_url.startsWith("/pay/") ? (
                <>
                  <UpiQr uri={new URL(show.pay_url, window.location.origin).toString()} />
                  <p className="mt-2 rounded-lg bg-[#fff4d6] px-2 py-1 text-[11px] font-bold text-[#7a5200] uppercase">Paytm sandbox · test payment · no real money</p>
                  <a className="mt-2 inline-block text-sm font-semibold text-signal underline" href={show.pay_url} target="_blank" rel="noopener noreferrer">Open the pay page</a>
                </>
              ) : <p className="rounded-xl bg-[#f5f8fc] p-3 text-sm break-all text-navy">{show.pay_url}</p>}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {show.method === "paytm_link" && (
                <a className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#25d366] px-3 text-sm font-semibold text-white" target="_blank" rel="noopener noreferrer"
                  href={`https://wa.me/?text=${encodeURIComponent(`${show.customer_name}, your ${show.item} pre-order: pay ₹${show.amount} here ${new URL(show.pay_url, window.location.origin).toString()}`)}`}>
                  <MessageCircle className="size-4" /> Share on WhatsApp
                </a>
              )}
              <Button size="sm" variant="secondary" onClick={() => { void navigator.clipboard?.writeText(new URL(show.pay_url!, window.location.origin).toString()); toast("Copied"); }}><Copy className="size-4" /> Copy</Button>
              <Button size="sm" variant="ghost" onClick={() => setShow(null)}>Close</Button>
            </div>
            <p className="mt-3 text-[11px] text-faint">Ref {show.order_ref}. {show.pay_url.startsWith("/pay/") ? "Scan it with a phone and tap Pay: the Soundbox announces it." : "Mark it paid once you see the payment in your app."}</p>
          </div>
        </div>
      )}
    </div>
  );
}
