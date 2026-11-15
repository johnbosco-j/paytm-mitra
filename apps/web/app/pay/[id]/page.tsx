"use client";

import { use, useEffect, useState } from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";

type Info = { sandbox: boolean; store: string; item: string; quantity: number; amount: string; status: string; ref: string };

/** Paytm SANDBOX pay page: the customer's side of a pre-order link. No real money moves; the page says so. */
export default function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [info, setInfo] = useState<Info | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/pay/${id}`).then(async (r) => (r.ok ? setInfo(await r.json()) : setErr("This payment link was not found."))).catch(() => setErr("Could not load the payment link."));
  }, [id]);

  async function pay() {
    setBusy(true);
    try {
      const r = await fetch(`/api/pay/${id}`, { method: "POST" });
      if (!r.ok) throw new Error();
      const d = await r.json();
      setInfo((i) => (i ? { ...i, status: d.status } : i));
    } catch {
      setErr("Payment could not be completed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const paid = info && info.status !== "awaiting_payment";
  return (
    <main className="grid min-h-screen place-items-center bg-[#eaf2fb] p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="bg-[#fff4d6] px-4 py-2 text-center text-[11px] font-bold tracking-wide text-[#7a5200] uppercase">Paytm sandbox · test payment · no real money moves</div>
        <div className="bg-gradient-to-br from-[#002e6e] to-[#0062c4] px-6 py-6 text-white">
          <p className="text-xs text-[#bfe9fb]">Paying</p>
          <p className="text-xl font-bold">{info?.store ?? "…"}</p>
          <p className="num mt-3 text-5xl font-black">₹{info ? Number(info.amount).toFixed(0) : "—"}</p>
          {info && <p className="mt-1 text-sm text-[#d6f1fd]">{info.quantity} × {info.item} · ref {info.ref}</p>}
        </div>
        <div className="p-6 text-center">
          {err && <p className="mb-3 text-sm text-[#b4161b]">{err}</p>}
          {paid ? (
            <div className="pop-in">
              <CheckCircle2 className="mx-auto size-16 text-[#21c17a]" />
              <p className="mt-2 text-lg font-bold text-[#002e6e]">Paid (sandbox)</p>
              <p className="mt-1 text-sm text-[#5a6577]">The shop&apos;s Soundbox just announced it. Your pre-order is reserved.</p>
            </div>
          ) : (
            <>
              <button onClick={pay} disabled={!info || busy} className="h-14 w-full rounded-2xl bg-[#00baf2] text-lg font-bold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-50">
                {busy ? "Paying…" : `Pay ₹${info ? Number(info.amount).toFixed(0) : ""}`}
              </button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-[#8b95a7]"><ShieldCheck className="size-3.5" /> Demo of the pay step. With a live merchant ID this opens Paytm&apos;s own page.</p>
            </>
          )}
        </div>
        <p className="border-t border-[#e4eaf2] px-4 py-3 text-center text-[10px] text-[#8b95a7]">MITRA prototype · not an official Paytm product · Made by RivenDevs</p>
      </div>
    </main>
  );
}
