"use client";

import Link from "next/link";
import { CalendarHeart, HeartPulse, Info, TrendingDown, TrendingUp, Users, Wallet } from "lucide-react";
import { useApp } from "@/components/providers";
import { Badge, Card, ErrorNote, PageHeader, Spinner, cx } from "@/components/ui";
import { rupees } from "@/lib/format";
import { useApiData } from "@/lib/useApiData";

type Forecast = {
  status: string; message?: string; week_total?: number; trend_pct?: number | null; method?: string;
  days?: { date: string; weekday: string; expected: number; low: number; high: number; festival: string | null }[];
  backtest?: { days: number; mape_model: number; mape_naive: number; beats_naive: boolean };
  upcoming_festivals?: { date: string; name: string; in_days: number }[];
};
type Cash = {
  status: string; message?: string; missing?: string[]; probability_shortfall?: number; earliest_risk_date?: string | null; expected_end?: number;
  p10_min?: number; band?: { date: string; p10: number; p50: number; p90: number }[]; biggest_outflow?: { date: string; amount: number } | null;
  assumptions?: Record<string, string>;
};
type Customers = { status: string; message?: string; customers?: number; counts?: Record<string, number>; at_risk?: { id: string; visits: number; last_visit: string; days_since: number; typical_gap: number; avg_spend: number }[]; at_risk_typical_spend?: number };
type Health = { score: number; band: string; components: { name: string; value: number; weight: number; detail: string }[]; disclaimer: string };

function Ring({ score }: { score: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const col = score >= 75 ? "#12a150" : score >= 55 ? "#00baf2" : "#e08600";
  return (
    <svg viewBox="0 0 128 128" className="size-36" role="img" aria-label={`Business health ${score} out of 100`}>
      <circle cx="64" cy="64" r={r} fill="none" stroke="#e8eef6" strokeWidth="12" />
      <circle cx="64" cy="64" r={r} fill="none" stroke={col} strokeWidth="12" strokeLinecap="round" strokeDasharray={c}
        strokeDashoffset={c * (1 - score / 100)} transform="rotate(-90 64 64)" className="transition-[stroke-dashoffset] duration-1000" />
      <text x="64" y="62" textAnchor="middle" className="fill-navy font-display text-[34px] font-black">{score}</text>
      <text x="64" y="82" textAnchor="middle" className="fill-[#8b95a7] text-[11px]">of 100</text>
    </svg>
  );
}

function CashChart({ band }: { band: NonNullable<Cash["band"]> }) {
  const W = 640, H = 200, pad = 28;
  const vals = band.flatMap((b) => [b.p10, b.p90, 0]);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const x = (i: number) => pad + (i / (band.length - 1)) * (W - pad * 2);
  const y = (v: number) => H - pad - ((v - lo) / (hi - lo || 1)) * (H - pad * 2);
  const area = band.map((b, i) => `${x(i)},${y(b.p90)}`).join(" ") + " " + band.map((b, i) => `${x(band.length - 1 - i)},${y(band[band.length - 1 - i].p10)}`).join(" ");
  const mid = band.map((b, i) => `${i ? "L" : "M"}${x(i)},${y(b.p50)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Projected cash balance, next 30 days">
      <defs>
        <linearGradient id="cashg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#00baf2" stopOpacity="0.35" /><stop offset="1" stopColor="#00baf2" stopOpacity="0.05" /></linearGradient>
      </defs>
      <line x1={pad} x2={W - pad} y1={y(0)} y2={y(0)} stroke="#e5383b" strokeDasharray="4 4" strokeWidth="1.5" />
      <text x={W - pad} y={y(0) - 6} textAnchor="end" className="fill-[#e5383b] text-[11px] font-semibold">₹0</text>
      <polygon points={area} fill="url(#cashg)" />
      <path d={mid} fill="none" stroke="#002e6e" strokeWidth="2.5" />
      {[0, 7, 14, 21, 29].map((i) => (
        <text key={i} x={x(i)} y={H - 6} textAnchor="middle" className="fill-[#8b95a7] text-[10px]">{band[i]?.date.slice(5)}</text>
      ))}
    </svg>
  );
}

export default function InsightsPage() {
  const { store } = useApp();
  const fc = useApiData<Forecast>("/insights/forecast", store?.id);
  const cash = useApiData<Cash>("/insights/cashflow", store?.id);
  const cust = useApiData<Customers>("/insights/customers", store?.id);
  const health = useApiData<Health>("/insights/health", store?.id);
  const maxDay = Math.max(1, ...(fc.data?.days?.map((d) => d.high) ?? [1]));

  return (
    <div className="rise space-y-5">
      <PageHeader title="Insights" sub="Forecasts and risks computed from your own sales, costs and dues. Every number shows how it was made." />

      <div className="grid gap-5 lg:grid-cols-[1fr_1.6fr]">
        {/* health */}
        <Card>
          <div className="mb-2 flex items-center gap-2 text-[16px] font-bold text-navy"><HeartPulse className="size-5 text-signal" /> Business health</div>
          {health.loading && !health.data ? <Spinner /> : health.error ? <ErrorNote message={health.error} onRetry={health.reload} /> : health.data && (
            <>
              <div className="flex items-center gap-5">
                <Ring score={health.data.score} />
                <div>
                  <Badge tone={health.data.band === "strong" ? "success" : health.data.band === "steady" ? "signal" : "caution"}>{health.data.band}</Badge>
                  <p className="mt-2 text-sm text-muted">Built from habits that grow a shop: logging asks, closing trials, knowing costs, cash buffer and loyal customers.</p>
                </div>
              </div>
              <ul className="mt-4 space-y-2">
                {health.data.components.map((c) => (
                  <li key={c.name}>
                    <div className="flex justify-between text-xs"><span className="font-semibold text-[#2d3748]">{c.name}</span><span className="text-faint">{c.detail}</span></div>
                    <div className="mt-1 h-1.5 rounded-full bg-[#eef3f9]"><div className="h-1.5 rounded-full bg-signal transition-all duration-700" style={{ width: `${c.value * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
              <p className="mt-3 flex gap-1.5 text-[11px] text-faint"><Info className="size-3.5 shrink-0" />{health.data.disclaimer}</p>
            </>
          )}
        </Card>

        {/* forecast */}
        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[16px] font-bold text-navy">Next 7 days · expected sales</p>
            {fc.data?.backtest && (
              <Badge tone={fc.data.backtest.beats_naive ? "success" : "neutral"}>
                backtest error {fc.data.backtest.mape_model}% vs {fc.data.backtest.mape_naive}% naive
              </Badge>
            )}
          </div>
          {fc.loading && !fc.data ? <Spinner /> : fc.data?.status !== "ok" ? (
            <p className="rounded-2xl bg-[#f5f8fc] p-5 text-sm text-muted">{fc.data?.message ?? fc.error} <Link href="/app/sales" className="font-semibold text-signal">Add sales</Link></p>
          ) : (
            <>
              <div className="flex items-end gap-2" style={{ height: 180 }} role="img" aria-label="Expected sales per day for the next 7 days">
                {fc.data.days!.map((d, i) => (
                  <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                    <span className="num text-[11px] font-semibold text-navy">{rupees(String(d.expected), true)}</span>
                    <div className="relative w-full rounded-t-xl bg-gradient-to-t from-[#002e6e] to-[#00baf2]" style={{ height: `${(d.expected / maxDay) * 100}%`, animation: `rise .6s ${i * 60}ms both` }}>
                    </div>
                    <span className="text-[11px] text-muted">{d.weekday}</span>
                    {d.festival && <span className="text-[10px] font-bold text-[#b86e00]">{d.festival}</span>}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                <span className="rounded-full bg-[#e6f6fd] px-3 py-1 font-semibold text-navy">Week ≈ {rupees(String(fc.data.week_total), true)}</span>
                {fc.data.trend_pct != null && (
                  <span className={cx("inline-flex items-center gap-1 rounded-full px-3 py-1 font-semibold", fc.data.trend_pct >= 0 ? "bg-[#e8f8ef] text-[#0e7a3d]" : "bg-[#fdeeee] text-[#b4161b]")}>
                    {fc.data.trend_pct >= 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}{fc.data.trend_pct}% vs last week
                  </span>
                )}
                {fc.data.upcoming_festivals?.map((f) => (
                  <span key={f.name} className="inline-flex items-center gap-1 rounded-full bg-[#fff4e0] px-3 py-1 font-semibold text-[#8a5a00]"><CalendarHeart className="size-4" />{f.name} in {f.in_days} days</span>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-faint">Method: {fc.data.method}. Backtested on the last {fc.data.backtest?.days} days against “same day last week”.</p>
            </>
          )}
        </Card>
      </div>

      {/* cash runway */}
      <Card>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-[16px] font-bold text-navy"><Wallet className="size-5 text-signal" /> Cash runway · next 30 days</p>
          {cash.data?.status === "ok" && <Badge tone="neutral">{cash.data.band?.length ? "2,000 simulated months" : ""}</Badge>}
        </div>
        {cash.loading && !cash.data ? <Spinner /> : cash.data?.status !== "ok" ? (
          <p className="rounded-2xl bg-[#f5f8fc] p-5 text-sm text-muted">{cash.data?.message ?? cash.error} <Link href="/app/team#settings" className="font-semibold text-signal">Open settings</Link></p>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1fr_2fr]">
            <div className="space-y-3">
              <div className={cx("rounded-2xl p-4", cash.data.probability_shortfall! > 0.2 ? "bg-[#fff4e0]" : "bg-[#e8f8ef]")}>
                <p className="text-xs font-semibold text-muted">Chance cash runs short</p>
                <p className={cx("num text-4xl font-black", cash.data.probability_shortfall! > 0.2 ? "text-[#b86e00]" : "text-[#0e7a3d]")}>{Math.round(cash.data.probability_shortfall! * 100)}%</p>
                {cash.data.earliest_risk_date && <p className="text-sm text-[#8a5a00]">Most likely around <b>{new Date(cash.data.earliest_risk_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</b>{cash.data.biggest_outflow ? ` when ${rupees(String(cash.data.biggest_outflow.amount), true)} is due` : ""}.</p>}
              </div>
              <p className="text-sm text-muted">Expected balance in 30 days: <b className="num text-navy">{rupees(String(cash.data.expected_end), true)}</b> · bad case low: <b className="num">{rupees(String(cash.data.p10_min), true)}</b></p>
              <p className="text-[11px] text-faint">Assumes cash on hand {rupees(cash.data.assumptions?.cash_on_hand)}, margin {cash.data.assumptions?.margin_pct}%, open trial purchases {rupees(cash.data.assumptions?.commitments)}. Sales are re-sampled from your last 8 weeks. A planning aid, not a loan offer.</p>
            </div>
            <div className="rounded-2xl bg-[#f7fbff] p-2"><CashChart band={cash.data.band!} /></div>
          </div>
        )}
      </Card>

      {/* customers */}
      <Card>
        <p className="mb-3 flex items-center gap-2 text-[16px] font-bold text-navy"><Users className="size-5 text-signal" /> Regular customers</p>
        {cust.loading && !cust.data ? <Spinner /> : cust.data?.status !== "ok" ? (
          <p className="rounded-2xl bg-[#f5f8fc] p-5 text-sm text-muted">{cust.data?.message ?? cust.error}</p>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
            <div className="grid grid-cols-3 gap-3">
              {([["regular", "Regulars", "bg-[#e8f8ef] text-[#0e7a3d]"], ["at_risk", "Drifting", "bg-[#fff4e0] text-[#8a5a00]"], ["lost", "Not back", "bg-[#fdeeee] text-[#b4161b]"]] as const).map(([k, l, cls]) => (
                <div key={k} className={cx("rounded-2xl p-4 text-center", cls)}>
                  <p className="num text-3xl font-black">{cust.data!.counts?.[k] ?? 0}</p>
                  <p className="text-xs font-semibold">{l}</p>
                </div>
              ))}
              <p className="col-span-3 text-sm text-muted">{cust.data.customers} repeat UPI payers recognised. Drifting regulars usually spend about <b className="text-navy">{rupees(String(cust.data.at_risk_typical_spend), true)}</b> per visit between them.</p>
            </div>
            <div>
              <ul className="divide-y divide-line">
                {cust.data.at_risk?.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 py-2 text-sm">
                    <span className="grid size-9 place-items-center rounded-full bg-[#fff4e0] text-xs font-bold text-[#8a5a00]">#{r.id.slice(0, 3)}</span>
                    <span className="flex-1">Usually every {r.typical_gap} days · last seen {r.days_since} days ago</span>
                    <span className="num font-semibold text-navy">{rupees(String(r.avg_spend), true)}/visit</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-faint">Customers are pseudonymous (hashed UPI IDs). To win them back, offer a pre-order or a festival basket when they visit; messaging needs their consent.</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
