"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Activity,
  ArrowRight,
  ChevronRight,
  CircleDollarSign,
  FlaskConical,
  HeartPulse,
  IndianRupee,
  Keyboard,
  ScanLine,
  Link2,
  MessageCircleQuestion,
  Mic,
  Package,
  PackageCheck,
  ScrollText,
  Settings,
  ShoppingBag,
  Sparkles,
  TriangleAlert,
  Users,
  WifiOff,
} from "lucide-react";
import { useApp } from "@/components/providers";
import { Badge, ErrorNote, Spinner } from "@/components/ui";
import type { Dashboard } from "@/lib/api";
import { rupees, titleCase } from "@/lib/format";
import { useApiData } from "@/lib/useApiData";

const TILES = [
  { href: "/app/demand", label: "Speak an ask", icon: Mic },
  { href: "/app/demand#type", label: "Type an ask", icon: Keyboard },
  { href: "/app/demand#ledger", label: "Demand ledger", icon: ScrollText },
  { href: "/app/opportunities", label: "Opportunities", icon: Sparkles },
  { href: "/app/trials", label: "Trials", icon: FlaskConical },
  { href: "/app/preorders", label: "Pre-orders", icon: ShoppingBag },
  { href: "/app/catalog", label: "Catalog", icon: Package },
  { href: "/app/ask", label: "Ask MITRA", icon: MessageCircleQuestion },
  { href: "/app/insights", label: "Insights", icon: HeartPulse },
  { href: "/app/sales", label: "Sales", icon: IndianRupee },
  { href: "/app/shelf", label: "Shelf scan", icon: ScanLine },
  { href: "/app/preorders#paytm", label: "Paytm links", icon: Link2 },
  { href: "/app/activity", label: "Activity", icon: Activity },
  { href: "/app/team", label: "Team", icon: Users },
  { href: "/app/team#settings", label: "Settings", icon: Settings },
];

/** Warm, time-aware greeting in the merchant's language (IST). */
function dayGreeting(lang: string, hour: number) {
  const en = hour < 12 ? ["Good morning", "Shutters up, the first customers are on their way."]
    : hour < 16 ? ["Good afternoon", "Quiet hours are good for planning the next trial."]
    : hour < 21 ? ["Good evening", "Peak time on the street. Every ask you hear counts."]
    : ["Good night", "Closing up? Quick look at what customers asked for today."];
  const ta = hour < 12 ? ["காலை வணக்கம்", "கடை திறந்தாச்சு, முதல் வாடிக்கையாளர் வருகிறார்."]
    : hour < 16 ? ["மதிய வணக்கம்", "அமைதியான நேரம், அடுத்த சோதனையைத் திட்டமிடலாம்."]
    : hour < 21 ? ["மாலை வணக்கம்", "கூட்டம் அதிகமான நேரம். ஒவ்வொரு கேள்வியும் முக்கியம்."]
    : ["இரவு வணக்கம்", "கடை மூடுகிறீர்களா? இன்று என்ன கேட்டார்கள் என்று பாருங்கள்."];
  return lang === "ta" ? ta : en;
}

const istHour = () => Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date()));

type Integrations = { offline_model: { available: boolean; model?: string }; cloud_ai: boolean; ai_mode: string; paytm_links: { connected: boolean }; upi_qr: { configured: boolean } };

export default function Today() {
  const { store, t, me, lang } = useApp();
  const [hour] = useState(istHour);
  const { data, error, loading, reload } = useApiData<Dashboard>("/dashboard", store?.id);
  const integ = useApiData<Integrations>("/integrations", store?.id);

  if (loading && !data) return <Spinner />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!data) return null;
  const max = Math.max(1, ...data.series.map((s) => s.asks));
  const week = data.series.slice(-7);

  return (
    <div className="rise space-y-5">
      {/* hero card */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#002e6e] via-[#00387f] to-[#0062c4] p-5 text-white shadow-[0_14px_40px_rgba(0,46,110,0.35)] md:p-7">
        <div className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-[#00baf2]/25 blur-2xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-display text-xl font-bold md:text-2xl">{dayGreeting(lang, hour)[0]}, {me?.user.name.split(" ")[0]} <span className="inline-block origin-[70%_70%] animate-[wave_2.2s_ease-in-out_1]">👋</span></p>
            <p className="mt-0.5 text-sm text-[#bfe9fb]">{dayGreeting(lang, hour)[1]} · {data.store.name}</p>
            <p className="mt-3 text-xs font-semibold tracking-wide text-[#9fe3fb] uppercase">Missed demand · last 7 days</p>
            <p className="num mt-1 text-4xl font-black tracking-tight md:text-5xl">{data.kpis.asks_7d}<span className="ml-2 text-lg font-semibold text-[#bfe9fb]">customer asks</span></p>
            <p className="mt-2 text-sm text-[#d6f1fd]">
              {data.kpis.items_7d} items · {data.kpis.ready_opportunities} ready to try · {data.kpis.open_trials} open trial(s)
            </p>
          </div>
          <div className="hidden h-20 items-end gap-1.5 sm:flex" role="img" aria-label="Missed asks per day, last 7 days">
            {week.map((s) => (
              <div key={s.date} className="flex h-full w-5 flex-col justify-end">
                <div className="rounded-t-md bg-[#00baf2]" style={{ height: `${Math.max(6, (s.asks / max) * 100)}%`, opacity: s.asks ? 1 : 0.35 }} />
              </div>
            ))}
          </div>
        </div>
        <div className="relative mt-4 flex flex-wrap gap-2">
          <Link href="/app/demand" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold whitespace-nowrap text-navy shadow md:px-5"><Mic className="size-4" /> {t.log_missed}</Link>
          <Link href="/app/opportunities" className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2.5 text-sm font-bold whitespace-nowrap text-white hover:bg-white/25 md:px-5">See opportunities <ArrowRight className="size-4" /></Link>
        </div>
        <div className="relative mt-5 grid grid-cols-2 gap-3 border-t border-white/15 pt-4 md:grid-cols-4">
          <MiniStat label="Gross profit from trials" value={rupees(data.kpis.realized_gross_profit)} />
          <MiniStat label="Completed trials" value={String(data.kpis.completed_trials)} />
          <MiniStat label="Ready opportunities" value={String(data.kpis.ready_opportunities)} />
          <MiniStat label="AI" value={integ.data ? (integ.data.ai_mode === "offline" ? "Offline (MITRA-Lite)" : integ.data.cloud_ai ? "Cloud + offline" : "Offline only") : "…"} />
        </div>
      </section>

      {data.sample_data_present && (
        <p className="rounded-xl border border-[#f7d79b] bg-[#fff8eb] px-4 py-2 text-xs font-medium text-[#8a5a00]">
          This store includes rows labeled SAMPLE for demonstration. Your own entries are shown without the label.
        </p>
      )}

      {/* quick action tiles */}
      <section className="rounded-3xl border border-line bg-white p-4 shadow-[0_2px_12px_rgba(16,40,80,0.05)] md:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-navy">MITRA for your shop</h2>
          <span className="text-xs font-semibold text-signal">Tamil · English</span>
        </div>
        <div className="grid grid-cols-4 gap-x-2 gap-y-4 md:grid-cols-8 lg:grid-cols-15">
          {TILES.map(({ href, label, icon: Icon }) => (
            <Link key={label} href={href} className="group flex flex-col items-center gap-1.5 text-center">
              <span className="grid size-[52px] place-items-center rounded-2xl bg-[#e6f6fd] text-navy transition-transform group-hover:-translate-y-0.5 group-hover:bg-[#d4effb]">
                <Icon className="size-6" />
              </span>
              <span className="text-[11.5px] leading-tight font-semibold text-[#2d3748]">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <section className="rounded-3xl border border-line bg-white p-5 shadow-[0_2px_12px_rgba(16,40,80,0.05)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[16px] font-bold text-navy">{t.attention}</h2>
            <Link href="/app/opportunities" className="text-sm font-semibold text-signal">View all</Link>
          </div>
          {data.attention.length === 0 ? (
            <p className="rounded-2xl bg-[#f5f8fc] p-5 text-sm text-muted">Nothing waiting. When a customer asks for something you don&apos;t have, tap <b>Speak</b>. MITRA tells you when it&apos;s worth stocking.</p>
          ) : (
            <ul className="divide-y divide-line">{data.attention.map((a, i) => <AttentionRow key={i} a={a} />)}</ul>
          )}
        </section>

        <div className="space-y-5">
          <section className="rounded-3xl border border-line bg-white p-5 shadow-[0_2px_12px_rgba(16,40,80,0.05)]">
            <h2 className="mb-3 text-[16px] font-bold text-navy">Most asked this week</h2>
            {data.top_items.length === 0 ? (
              <p className="text-sm text-faint">No confirmed asks yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {data.top_items.map(([name, n]) => (
                  <li key={name}>
                    <div className="flex justify-between text-sm"><span className="font-medium">{titleCase(name)}</span><span className="num font-semibold text-navy">{n}</span></div>
                    <div className="mt-1 h-1.5 rounded-full bg-[#eef3f9]"><div className="h-1.5 rounded-full bg-signal" style={{ width: `${(n / data.top_items[0][1]) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <Link href="/app/team#settings" className="flex items-center gap-3 rounded-3xl bg-[#e8f8ef] p-4">
            <span className="grid size-11 place-items-center rounded-2xl bg-white text-[#0e7a3d]"><WifiOff className="size-5" /></span>
            <span className="flex-1">
              <span className="block text-sm font-bold text-[#0b5e30]">Works without internet</span>
              <span className="block text-xs text-[#2f7a4d]">MITRA-Lite {integ.data?.offline_model.available ? "is running on this device" : "can run on this device"}. Switch to offline mode in Settings.</span>
            </span>
            <ChevronRight className="size-4 text-[#2f7a4d]" />
          </Link>
          <Link href="/app/preorders" className="flex items-center gap-3 rounded-3xl bg-[#e6f6fd] p-4">
            <span className="grid size-11 place-items-center rounded-2xl bg-white text-navy"><ShoppingBag className="size-5" /></span>
            <span className="flex-1">
              <span className="block text-sm font-bold text-navy">Turn missed asks into pre-orders</span>
              <span className="block text-xs text-muted">Collect advance payment with a Paytm payment link or your UPI QR.</span>
            </span>
            <ChevronRight className="size-4 text-navy" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-[#9fd8f0]">{label}</p>
      <p className="num text-[15px] font-bold">{value}</p>
    </div>
  );
}

function AttentionRow({ a }: { a: Dashboard["attention"][number] }) {
  const name = titleCase(a.display_name ?? a.item);
  const cfg = {
    approval: { icon: CircleDollarSign, cls: "bg-[#fff4e0] text-[#b86e00]", text: `Approve a ${a.qty}-unit trial of ${name}?`, href: "/app/trials" },
    receive: { icon: PackageCheck, cls: "bg-[#e6f6fd] text-navy", text: `${name}: record stock when it arrives`, href: "/app/trials" },
    outcome: { icon: FlaskConical, cls: "bg-[#e6f6fd] text-navy", text: `${name}: record how many sold`, href: "/app/trials" },
    opportunity: { icon: Sparkles, cls: "bg-[#e8f8ef] text-[#0e7a3d]", text: `${a.asks} asks for ${name}. Try ${a.qty} units?`, href: "/app/opportunities" },
    needs_cost: { icon: TriangleAlert, cls: "bg-[#fff4e0] text-[#b86e00]", text: `${a.asks} asks for ${name}. Add its cost & price to check it pays.`, href: "/app/opportunities" },
  }[a.kind];
  const Icon = cfg.icon;
  return (
    <li>
      <Link href={cfg.href} className="group flex items-center gap-3 py-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${cfg.cls}`}><Icon className="size-5" aria-hidden /></span>
        <span className="flex-1 text-sm font-medium">{cfg.text}</span>
        {a.score !== undefined && <Badge tone="signal">score {a.score}</Badge>}
        <ChevronRight className="size-4 text-faint group-hover:text-signal" aria-hidden />
      </Link>
    </li>
  );
}
