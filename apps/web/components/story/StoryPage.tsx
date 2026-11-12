"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BadgeCheck, Calculator, ChevronDown, Ear, LineChart, Lock, Mic, ShieldCheck, Smartphone, WifiOff, Zap } from "lucide-react";
import { STEP_IDS, useStory } from "@/lib/story";
import { useApp } from "@/components/providers";
import { SmoothScroll } from "./SmoothScroll";
import { StoryScroll } from "./StoryScroll";

const StoryCanvas = dynamic(() => import("@/components/three/StoryCanvas"), { ssr: false });

type Chapter = { kicker: string; title: string; body: string; chips?: string[] };
const CHAPTERS: Chapter[] = [
  { kicker: "6:40 pm · Velachery, Chennai", title: "A customer walks into Murugan Stores", body: "Sixty years of trust, one small shop, a QR on the counter that takes every payment." , chips: ["Kirana", "Tamil-speaking owner"] },
  { kicker: "The ask", title: "“Anna, mango lassi irukka?”", body: "She wants a chilled mango lassi. It's the third person today." },
  { kicker: "The answer", title: "“Illa.”", body: "Murugan doesn't stock it. She walks out. The sale didn't fail. It never existed.", chips: ["Lost sale"] },
  { kicker: "The blind spot", title: "The QR never sees it", body: "No payment means no record. Every payments dashboard, even the AI ones, sees only what sold, never what was asked for and missed.", chips: ["₹0 recorded", "0 signals"] },
  { kicker: "A week later", title: "24 asks. Zero data.", body: "It happened 24 times in 7 days. Murugan remembers maybe three. Nobody wrote it down." },
  { kicker: "MITRA listens", title: "One tap. Speak Tamil, Tanglish or English.", body: "“Innaiku ettu per mango lassi ketanga.” MITRA turns it into a confirmed record: item, how many asked, why it wasn't sold. It even works offline on our own model, MITRA-Lite.", chips: ["Voice", "Offline-capable", "Merchant confirms"] },
  { kicker: "MITRA evaluates", title: "Maths, not guesses", body: "24 asks aren't 24 sales. With cost ₹22 and price ₹35, MITRA suggests a cautious 16-bottle trial: ₹352 outlay, ₹104–₹208 gross profit if 8–16 sell. No cost price, no profit promise.", chips: ["Deterministic ₹ maths", "Risk shown"] },
  { kicker: "Murugan decides", title: "Owner approves. MITRA never acts alone.", body: "Staff can propose, only the owner can spend. MITRA drafts the supplier WhatsApp in Tamil, and Murugan presses send.", chips: ["Owner-only", "Audit trail"] },
  { kicker: "Next morning", title: "The stock arrives", body: "And the customers who asked can pre-order and pay in advance with a Paytm payment link, so the missed sale becomes a confirmed one.", chips: ["Pre-order", "Paytm payment link"] },
  { kicker: "MITRA proves it", title: "14 of 16 sold. +₹182 gross profit.", body: "Revenue ₹490, cost of goods ₹308, 2 bottles left (₹44). Predicted vs actual, recorded, so the next decision is smarter.", chips: ["Predicted vs actual"] },
];

function Header() {
  const { me } = useApp();
  return (
    <header className="fixed inset-x-0 top-0 z-40">
      <div className="mx-auto mt-3 flex max-w-6xl items-center justify-between rounded-2xl bg-white/95 px-4 py-2.5 shadow-[0_8px_30px_rgba(0,46,110,0.18)] backdrop-blur md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-xl bg-[#002e6e] text-[13px] font-black text-white">M</span>
          <span className="leading-tight">
            <span className="block text-[17px] font-extrabold tracking-tight text-[#002e6e]">MITRA</span>
            <span className="block text-[10px] font-medium text-[#00a3e0]">for Paytm merchants</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-semibold text-[#002e6e] md:flex">
          <a href="#how">How it works</a>
          <a href="#trust">Trust</a>
          <a href="#paytm">Paytm fit</a>
        </nav>
        <Link href={me ? "/app" : "/login"} className="rounded-full bg-[#00baf2] px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-[#00a3e0]">
          {me ? "Open my shop" : "Sign in"}
        </Link>
      </div>
    </header>
  );
}

function Loader({ done }: { done: boolean }) {
  return (
    <div className={`fixed inset-0 z-50 grid place-items-center bg-[#002e6e] transition-opacity duration-1000 ${done ? "pointer-events-none opacity-0" : "opacity-100"}`}>
      <div className="text-center text-white">
        <p className="text-4xl font-black tracking-tight">MITRA</p>
        <p className="mt-2 text-sm text-[#8fd8f5]">Building Murugan Stores…</p>
        <div className="mx-auto mt-5 h-1 w-48 overflow-hidden rounded-full bg-white/15">
          <div className="h-full w-1/2 animate-[loader_1.1s_ease-in-out_infinite] rounded-full bg-[#00baf2]" />
        </div>
      </div>
    </div>
  );
}

function ProgressRail() {
  const step = useStory((s) => s.step);
  const progress = useStory((s) => s.progress);
  return (
    <div className="pointer-events-none fixed top-1/2 right-4 z-30 hidden -translate-y-1/2 flex-col gap-2 lg:flex">
      {STEP_IDS.map((id, i) => (
        <span key={id} className={`block h-2 w-2 rounded-full transition-all ${i === step ? "scale-150 bg-[#00baf2]" : i < step ? "bg-white/80" : "bg-white/30"}`} />
      ))}
      <span className="mt-2 text-center text-[10px] font-semibold text-white/70">{Math.round(progress * 100)}%</span>
    </div>
  );
}

export function StoryPage() {
  const [ready, setReady] = useState(false);
  const [shot, setShot] = useState<number | null>(null);
  const [clean, setClean] = useState(false);
  const { me } = useApp();
  // `?shot=N` pins chapter N with a snapped camera: used for screenshots, the pitch video and the deck.
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("shot");
    if (v === null) return;
    const n = Math.max(0, Math.min(STEP_IDS.length - 1, Number(v) || 0));
    useStory.getState().set({ step: n, stepT: 0, reduced: true });
    queueMicrotask(() => {
      setShot(n);
      setClean(new URLSearchParams(window.location.search).has("clean"));
    });
    requestAnimationFrame(() => document.querySelector(`[data-step="${n}"]`)?.scrollIntoView());
  }, []);
  return (
    <SmoothScroll>
      <Loader done={ready || shot !== null} />
      <StoryCanvas onReady={() => setReady(true)} />
      {shot === null && <StoryScroll />}
      {!clean && <Header />}
      {!clean && <ProgressRail />}

      <main id="story" className={clean ? "invisible relative z-10" : "relative z-10"}>
        {/* 0 · hero */}
        <section data-step={0} className="flex min-h-[100svh] items-end pb-24 md:items-center md:pb-0">
          <div className="mx-auto w-full max-w-6xl px-5">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-[#002e6e] shadow">
              <span className="size-1.5 rounded-full bg-[#00baf2]" /> Paytm Build for India AI · Track 1 · Merchant Growth AI
            </p>
            <h1 className="max-w-3xl text-[44px] font-black leading-[1.02] tracking-tight text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.55)] md:text-[80px]">
              Every QR knows what sold.
              <br />
              <span className="text-[#00baf2]">MITRA hears what didn&apos;t.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/85 drop-shadow">
              The AI business partner that captures the sales India&apos;s kirana stores lose every day, and turns them into small, safe, profitable decisions.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={me ? "/app" : "/signup"} className="inline-flex items-center gap-2 rounded-full bg-[#00baf2] px-6 py-3.5 font-bold text-white shadow-xl hover:bg-[#00a3e0]">
                {me ? "Open my shop" : "Start free"} <ArrowRight className="size-4" />
              </Link>
              <a href="#ch1" className="inline-flex items-center gap-2 rounded-full bg-white/15 px-6 py-3.5 font-bold text-white backdrop-blur hover:bg-white/25">
                Watch the story <ChevronDown className="size-4" />
              </a>
            </div>
          </div>
        </section>

        {/* 1..9 · chapters */}
        {CHAPTERS.map((c, i) => (
          <section key={c.title} id={`ch${i + 1}`} data-step={i + 1} className="flex min-h-[120svh] items-end pb-16 md:items-center md:pb-0">
            <div className="mx-auto w-full max-w-6xl px-5">
              <article data-reveal className="max-w-md rounded-3xl bg-white/95 p-6 shadow-[0_20px_60px_rgba(0,20,60,0.35)] backdrop-blur md:p-7">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#00a3e0]">
                  {String(i + 1).padStart(2, "0")} · {c.kicker}
                </p>
                <h2 className="mt-2 text-[28px] font-black leading-tight tracking-tight text-[#002e6e] md:text-[34px]">{c.title}</h2>
                <p className="mt-3 text-[15.5px] leading-relaxed text-[#38465a]">{c.body}</p>
                {c.chips && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {c.chips.map((x) => (
                      <span key={x} className="rounded-full bg-[#e8f7fd] px-3 py-1 text-xs font-bold text-[#002e6e]">{x}</span>
                    ))}
                  </div>
                )}
              </article>
            </div>
          </section>
        ))}

        {/* 10 · cta over the wide shot */}
        <section data-step={11} className="flex min-h-[110svh] items-center">
          <div className="mx-auto w-full max-w-6xl px-5 text-center">
            <h2 data-reveal className="mx-auto max-w-3xl text-4xl font-black leading-tight text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.6)] md:text-6xl">
              Listen. Evaluate. Approve. <span className="text-[#00baf2]">Prove.</span>
            </h2>
            <p data-reveal className="mx-auto mt-4 max-w-xl text-lg text-white/85">The LEAP loop, for every merchant who has ever said “illa”.</p>
            <div data-reveal className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href={me ? "/app" : "/signup"} className="rounded-full bg-[#00baf2] px-7 py-4 font-bold text-white shadow-xl hover:bg-[#00a3e0]">Try MITRA</Link>
              <Link href="/login" className="rounded-full bg-white px-7 py-4 font-bold text-[#002e6e] shadow-xl">Open the demo store</Link>
            </div>
          </div>
        </section>
      </main>

      {/* After the story: product sections on Paytm-style white */}
      <div className="relative z-20 bg-white text-[#101828]">
        <section id="how" className="mx-auto max-w-6xl px-5 py-24">
          <p data-reveal className="text-sm font-bold uppercase tracking-[0.16em] text-[#00a3e0]">How it works</p>
          <h2 data-reveal className="mt-2 max-w-2xl text-4xl font-black tracking-tight text-[#002e6e]">From a missed ask to a measured profit, in four steps</h2>
          <div className="mt-12 grid gap-5 md:grid-cols-4">
            {[
              { i: Ear, k: "Listen", d: "Voice or text in Tamil, Tanglish or English. The merchant confirms every record. Nothing is guessed." },
              { i: Calculator, k: "Evaluate", d: "Confirmed demand + real cost and price → a ranked, explained trial size with outlay, margin and leftover risk." },
              { i: BadgeCheck, k: "Approve", d: "Owner-only approval, drafted supplier message and optional Paytm pre-order links. Never auto-sends." },
              { i: LineChart, k: "Prove", d: "Record what sold. Revenue, gross profit, cash vs outlay and leftover, predicted vs actual." },
            ].map(({ i: Icon, k, d }, n) => (
              <div key={k} data-reveal className="rounded-3xl border border-[#e6edf5] bg-[#f7fbff] p-6">
                <span className="grid size-12 place-items-center rounded-2xl bg-[#e1f5fe] text-[#002e6e]"><Icon className="size-6" /></span>
                <p className="mt-4 text-xs font-bold text-[#00a3e0]">STEP {n + 1}</p>
                <p className="text-xl font-extrabold text-[#002e6e]">{k}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-[#475467]">{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#002e6e] py-20 text-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 md:grid-cols-4">
            {[
              { n: 16, s: " units", l: "suggested trial from 24 asks, not 24" },
              { n: 182, p: "₹", l: "gross profit in the demo trial (sample data)" },
              { n: 5, s: " sec", l: "to log a missed request by voice" },
              { n: 0, l: "messages or payments MITRA sends on its own" },
            ].map((x) => (
              <div key={x.l} data-reveal>
                <p className="text-5xl font-black text-[#00baf2]" data-count={x.n} data-prefix={x.p ?? ""} data-suffix={x.s ?? ""}>
                  {(x.p ?? "") + x.n + (x.s ?? "")}
                </p>
                <p className="mt-2 text-sm text-white/75">{x.l}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="trust" className="mx-auto max-w-6xl px-5 py-24">
          <p data-reveal className="text-sm font-bold uppercase tracking-[0.16em] text-[#00a3e0]">Built to be trusted with a shop&apos;s money</p>
          <h2 data-reveal className="mt-2 max-w-2xl text-4xl font-black tracking-tight text-[#002e6e]">AI understands the language. Code does the money. The owner decides.</h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              { i: Calculator, k: "Deterministic money maths", d: "Every rupee is computed by tested Decimal code, never by the language model." },
              { i: ShieldCheck, k: "Owner-only spending", d: "Role-based access per store. Staff can log and propose; the server refuses their approvals." },
              { i: Lock, k: "Secure by default", d: "httpOnly sessions, rate limits, encrypted customer phone numbers, append-only audit log." },
              { i: WifiOff, k: "Works offline", d: "MITRA-Lite, our own fine-tuned model, runs on the shop's laptop with no internet." },
              { i: Mic, k: "Tamil first", d: "Tamil script, Tanglish and English, trained on kirana vocabulary." },
              { i: Zap, k: "Honest when unsure", d: "No cost price, no profit claim. Vague counts and sizes are flagged for the merchant." },
            ].map(({ i: Icon, k, d }) => (
              <div key={k} data-reveal className="rounded-3xl border border-[#e6edf5] p-6 shadow-[0_6px_24px_rgba(0,46,110,0.06)]">
                <Icon className="size-7 text-[#00baf2]" />
                <p className="mt-3 text-lg font-extrabold text-[#002e6e]">{k}</p>
                <p className="mt-1.5 text-[15px] text-[#475467]">{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="paytm" className="bg-[#f2f9fe] py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 md:grid-cols-2">
            <div>
              <p data-reveal className="text-sm font-bold uppercase tracking-[0.16em] text-[#00a3e0]">Designed for the Paytm ecosystem</p>
              <h2 data-reveal className="mt-2 text-4xl font-black tracking-tight text-[#002e6e]">The Soundbox tells you what sold. MITRA tells you what you missed.</h2>
              <ul data-reveal className="mt-6 space-y-3 text-[15px] text-[#344054]">
                <li className="flex gap-3"><Smartphone className="mt-0.5 size-5 shrink-0 text-[#00baf2]" /> A tile in the Paytm for Business app, and a voice skill on the AI Soundbox.</li>
                <li className="flex gap-3"><Zap className="mt-0.5 size-5 shrink-0 text-[#00baf2]" /> Pre-orders paid through Paytm Payment Links, so missed demand becomes collected revenue.</li>
                <li className="flex gap-3"><LineChart className="mt-0.5 size-5 shrink-0 text-[#00baf2]" /> Trial outcomes become consented cash-flow evidence for partner working capital.</li>
              </ul>
              <p className="mt-6 text-xs text-[#667085]">Hackathon prototype. Not an official Paytm product or integration. Paytm connections stay off until approved credentials exist.</p>
            </div>
            <div data-reveal className="mx-auto w-[300px] rounded-[42px] border-[10px] border-[#0b1220] bg-white p-3 shadow-2xl">
              <div className="rounded-3xl bg-gradient-to-br from-[#002e6e] to-[#0057b8] p-4 text-white">
                <p className="text-xs opacity-80">Missed demand · this week</p>
                <p className="text-3xl font-black">32 asks</p>
                <p className="mt-1 text-xs text-[#8fd8f5]">Mango Lassi ready to try · score 99</p>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[10px] font-semibold text-[#002e6e]">
                {["Speak", "Ledger", "Trials", "Pre-order", "Catalog", "Ask", "Team", "Paytm"].map((t) => (
                  <div key={t}><div className="mx-auto mb-1 size-11 rounded-2xl bg-[#e1f5fe]" />{t}</div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-10 text-sm text-[#667085]">
          <p><b className="text-[#002e6e]">MITRA</b> · Missed-demand Intelligence for Trade, Restock &amp; Action</p>
          <p>Johnbosco J · Jeffrey Figo J · Joe Naren A · Chennai 2026</p>
        </footer>
      </div>
    </SmoothScroll>
  );
}
