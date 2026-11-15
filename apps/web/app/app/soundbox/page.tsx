"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Ear, IndianRupee, Megaphone, PlayCircle, ShieldCheck, Sparkles, Volume2 } from "lucide-react";
import { LanguagePicker } from "@/components/language-picker";
import { useApp } from "@/components/providers";
import { Badge, Button, Card, PageHeader, cx } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { startListening, type Listener } from "@/lib/listener";

type Logged = { id: string; item: string; ask_count: number; reason: string };
type Heard = { heard: boolean; gloss?: string; language?: string; logged: Logged[]; say: string | null };
type Feed = { now: string; payments: { id: string; amount: string; item: string; customer: string; ref: string; say: string }[] };
type Event = { id: number; kind: "heard" | "logged" | "said" | "paid" | "info"; text: string; at: string };

const SAMPLES: Record<string, { label: string; text: string }> = {
  ta: { label: "Tamil", text: "அண்ணா, மாம்பழ லஸ்ஸி இருக்கா? இல்லம்மா, நம்ம கடையில அது இல்ல." },
  hi: { label: "Hindi", text: "भैया, अमूल बटर है क्या? नहीं बहन जी, आज खत्म हो गया।" },
  en: { label: "English", text: "Do you have rose milk? Sorry, we don't keep rose milk in this shop." },
};
const REASON: Record<string, string> = { not_stocked: "not stocked", out_of_stock: "out of stock", variant_missing: "size missing", too_expensive: "too costly", unknown: "reason unclear" };
const storeHeader = () => ({ "X-Store-Id": localStorage.getItem("mitra.store") ?? "" });

async function ttsBlob(text: string): Promise<Blob> {
  const r = await fetch("/api/speak", { method: "POST", headers: { "Content-Type": "application/json", ...storeHeader() }, body: JSON.stringify({ text }) });
  if (!r.ok) throw new Error("voice unavailable");
  return r.blob();
}

export default function SoundboxPage() {
  const { store, toast, celebrate } = useApp();
  const owner = store?.role === "owner";
  const [ai, setAi] = useState(false);
  const [consent, setConsent] = useState(false);
  const [ask, setAsk] = useState(false);
  const [level, setLevel] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [state, setState] = useState<"idle" | "listening" | "thinking" | "talking">("idle");
  const [events, setEvents] = useState<Event[]>([]);
  const [counts, setCounts] = useState({ asks: 0, paid: 0 });
  const [langPick, setLangPick] = useState<string | null>(null);
  const lang = langPick ?? store?.language ?? "ta";
  const listener = useRef<Listener | null>(null);
  const since = useRef(new Date().toISOString());
  const seq = useRef(0);
  const busy = useRef(0);
  const langRef = useRef(lang);
  useEffect(() => { langRef.current = lang; }, [lang]);

  const push = useCallback((kind: Event["kind"], text: string) => {
    setEvents((e) => [{ id: ++seq.current, kind, text, at: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) }, ...e].slice(0, 40));
  }, []);

  /** The Soundbox speaks. Listening pauses while it talks so it never hears itself. */
  const say = useCallback(async (text: string) => {
    push("said", text);
    listener.current?.pause(true);
    setState("talking");
    try {
      const url = URL.createObjectURL(await ttsBlob(text));
      await new Promise<void>((done) => {
        const a = new Audio(url);
        a.onended = a.onerror = () => { URL.revokeObjectURL(url); done(); };
        void a.play().catch(() => done());
      });
    } catch {
      /* voice not available in this language: the line still shows on the display */
    } finally {
      listener.current?.pause(false);
      setState(listener.current ? "listening" : "idle");
    }
  }, [push]);

  const hear = useCallback(async (wav: Blob) => {
    busy.current++;
    setState("thinking");
    try {
      const fd = new FormData();
      fd.append("audio", wav, "segment.wav");
      fd.append("language", langRef.current);
      const r = await api<Heard>("/soundbox/hear", { form: fd });
      if (r.gloss) push("heard", r.gloss);
      for (const l of r.logged) push("logged", `${l.item} × ${l.ask_count} · ${REASON[l.reason] ?? l.reason}`);
      if (r.logged.length) setCounts((c) => ({ ...c, asks: c.asks + r.logged.reduce((n, l) => n + l.ask_count, 0) }));
      if (r.say) await say(r.say);
    } catch (e) {
      push("info", e instanceof ApiError ? e.message : "Could not process that.");
    } finally {
      busy.current--;
      if (!busy.current) setState(listener.current ? "listening" : "idle");
    }
  }, [push, say]);

  async function aiOn() {
    try {
      await api("/soundbox/listening", { body: { on: true, notice_displayed: true } });
      listener.current = await startListening({ onSegment: (wav) => void hear(wav), onLevel: (l, s) => { setLevel(l); setSpeaking(s); } });
      setAi(true);
      setAsk(false);
      setState("listening");
      push("info", "AI button on. Listening for what customers ask for.");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Could not start listening", "err");
    }
  }

  function aiOff() {
    listener.current?.stop();
    listener.current = null;
    setAi(false);
    setLevel(0);
    setState("idle");
    void api("/soundbox/listening", { body: { on: false } }).catch(() => null);
    push("info", "AI button off. Payments are still announced.");
  }

  useEffect(() => () => listener.current?.stop(), []);

  // Payments: an ordinary Soundbox job, AI button or not.
  useEffect(() => {
    if (!store?.id) return;
    const t = window.setInterval(async () => {
      try {
        const f = await api<Feed>(`/soundbox/feed?since=${encodeURIComponent(since.current)}`);
        since.current = f.now;
        for (const p of f.payments) {
          push("paid", `₹${Number(p.amount).toFixed(0)} received · ${p.customer} · ${p.item} (sandbox)`);
          setCounts((c) => ({ ...c, paid: c.paid + 1 }));
          celebrate(`₹${Number(p.amount).toFixed(0)} received`, `${p.customer} paid for ${p.item} (Paytm sandbox).`);
          await say(p.say);
        }
      } catch { /* offline for a moment */ }
    }, 4000);
    return () => window.clearInterval(t);
  }, [store?.id, push, say, celebrate]);

  async function sample(code: string) {
    push("info", `SAMPLE customer (${SAMPLES[code].label}) played to the Soundbox.`);
    try {
      langRef.current = code;
      await hear(await ttsBlob(SAMPLES[code].text));
    } catch {
      toast("Sample voice is not available right now.", "err");
    } finally {
      langRef.current = lang;
    }
  }

  const display = state === "thinking" ? "Understanding…" : state === "talking" ? "Speaking" : ai ? (speaking ? "Hearing a customer…" : "Listening") : "Ready · payments only";
  const tone = { heard: "text-[#5a6577]", logged: "text-[#0a6b3c]", said: "text-navy", paid: "text-[#8a5a00]", info: "text-faint" } as const;
  const Icon = { heard: Ear, logged: Sparkles, said: Megaphone, paid: IndianRupee, info: ShieldCheck } as const;

  return (
    <div className="rise space-y-5">
      <PageHeader title="Soundbox" sub="Your Soundbox already announces payments. Press the AI button and it also hears what customers asked for and didn't get, and tells you what to stock." />
      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        {/* the virtual device */}
        <div className="space-y-3">
          <div className="relative mx-auto w-full max-w-[360px] rounded-[44px] bg-gradient-to-b from-[#1b2a44] to-[#0b1424] p-6 shadow-[0_30px_60px_rgba(0,20,60,0.45)]">
            <p className="text-center text-[10px] font-bold tracking-[0.3em] text-white/45 uppercase">Soundbox · virtual</p>
            <div className="mt-3 rounded-2xl bg-[#04101f] px-4 py-3 text-center font-mono shadow-inner">
              <p className={cx("text-sm font-semibold", ai ? "text-[#7fe8ff]" : "text-[#9db3cc]")} aria-live="polite">{display}</p>
              <div className="mt-2 flex h-6 items-end justify-center gap-[3px]" aria-hidden>
                {Array.from({ length: 22 }, (_, i) => {
                  const h = ai ? Math.max(0.12, level * (0.55 + 0.45 * Math.abs(Math.sin(i * 1.7 + level * 9)))) : 0.12;
                  return <span key={i} className={cx("w-[5px] rounded-full transition-[height] duration-100", speaking ? "bg-[#00baf2]" : "bg-[#2b4a6f]")} style={{ height: `${h * 100}%` }} />;
                })}
              </div>
            </div>
            {/* speaker grille */}
            <div className="mx-auto mt-5 grid size-40 place-items-center rounded-full bg-[#0a1626] shadow-[inset_0_6px_18px_rgba(0,0,0,0.6)]">
              <div className="grid grid-cols-9 gap-[5px]" aria-hidden>
                {Array.from({ length: 81 }, (_, i) => <span key={i} className={cx("size-[5px] rounded-full", state === "talking" ? "animate-pulse bg-[#00baf2]" : "bg-[#24364f]")} />)}
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between">
              <div className="rounded-xl bg-white p-1.5 text-[8px] leading-tight font-bold text-navy">
                <div className="grid size-12 grid-cols-6 gap-[2px]" aria-hidden>{Array.from({ length: 36 }, (_, i) => <span key={i} className={(i * 7) % 5 < 2 ? "bg-navy" : "bg-white"} />)}</div>
                SCAN &amp; PAY
              </div>
              <button
                onClick={() => (ai ? aiOff() : owner ? setAsk(true) : toast("Only the owner can switch the AI button on.", "err"))}
                aria-pressed={ai}
                aria-label={ai ? "Turn AI button off" : "Turn AI button on"}
                className={cx("relative grid size-20 place-items-center rounded-full text-lg font-black tracking-wide transition",
                  ai ? "bg-[#00baf2] text-white shadow-[0_0_0_6px_rgba(0,186,242,0.25),0_0_40px_rgba(0,186,242,0.8)]" : "bg-[#22354f] text-[#9db3cc] shadow-[inset_0_-4px_8px_rgba(0,0,0,0.5)] hover:text-white")}
              >
                {ai && <span className="absolute inset-0 animate-ping rounded-full bg-[#00baf2]/40" />}
                <span className="relative">AI</span>
              </button>
            </div>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-white/55">
              <span className={cx("size-2 rounded-full", ai ? "animate-pulse bg-[#ff4d4f]" : "bg-white/25")} /> {ai ? "LIVE · listening at the counter" : "AI button off"}
            </p>
          </div>
          <Card className="text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="sb-lang" className="text-muted">Counter language</label>
              <LanguagePicker id="sb-lang" value={lang} onChange={setLangPick} className="w-auto max-w-[220px] py-1.5 text-sm" />
            </div>
            <p className="mt-3 mb-1.5 text-xs font-semibold text-navy">No customer nearby? Play a SAMPLE one:</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(SAMPLES).map(([code, s]) => (
                <Button key={code} size="sm" variant="secondary" onClick={() => sample(code)} disabled={state === "thinking" || state === "talking"}><PlayCircle className="size-4" /> {s.label}</Button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-faint">Samples are computer-spoken lines sent through the same listening path. They are labelled SAMPLE in the log.</p>
          </Card>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Card><p className="text-xs text-muted">Asks heard this session</p><p className="num text-3xl font-black text-navy">{counts.asks}</p></Card>
            <Card><p className="text-xs text-muted">Payments announced</p><p className="num text-3xl font-black text-navy">{counts.paid}</p></Card>
            <Card className="col-span-2 sm:col-span-1"><p className="text-xs text-muted">AI button add-on</p><p className="text-lg font-black text-navy">₹149 / month</p><p className="text-[11px] text-faint">pilot pricing idea, not a Paytm price</p></Card>
          </div>
          <Card>
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-[16px] font-bold text-navy"><Volume2 className="size-5 text-signal" /> Live log</p>
              <Badge tone={ai ? "signal" : undefined}>{ai ? "AI on" : "AI off"}</Badge>
            </div>
            {events.length === 0 ? (
              <p className="py-8 text-center text-sm text-faint">Press the AI button, or play a sample customer. What the Soundbox hears, logs and says shows up here.</p>
            ) : (
              <ul className="max-h-[420px] space-y-2 overflow-y-auto" aria-live="polite">
                {events.map((e) => {
                  const I = Icon[e.kind];
                  return (
                    <li key={e.id} className="flex items-start gap-3 rounded-xl bg-canvas px-3 py-2 text-sm">
                      <I className={cx("mt-0.5 size-4 shrink-0", tone[e.kind])} />
                      <span className="min-w-0 flex-1">
                        <span className="mr-2 text-[10px] font-bold tracking-wide text-faint uppercase">{e.kind === "said" ? "Soundbox said" : e.kind}</span>
                        <span className={tone[e.kind]}>{e.text}</span>
                      </span>
                      <span className="num shrink-0 text-[11px] text-faint">{e.at}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
          <Card className="text-sm text-muted">
            <p className="mb-1 flex items-center gap-2 font-semibold text-navy"><ShieldCheck className="size-4 text-signal" /> What the AI button keeps, and what it throws away</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Kept: the item, how many asked, and why it wasn&apos;t sold. Rows are marked &ldquo;heard by Soundbox&rdquo; and can be dismissed.</li>
              <li>Thrown away at once: the audio, the words spoken, greetings, bargaining, payment talk.</li>
              <li>Only the owner can switch it on, after displaying a &ldquo;voice assistant in use&rdquo; notice. Every switch is in the activity log.</li>
            </ul>
          </Card>
        </div>
      </div>

      {ask && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#0b1f3a]/55 p-4" role="dialog" aria-modal="true" aria-label="Turn on the AI button" onClick={() => setAsk(false)}>
          <div className="rise w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-bold text-navy">Turn on the AI button?</p>
            <p className="mt-2 text-sm text-muted">The Soundbox will listen at your counter and note what customers ask for that you don&apos;t have. It never saves audio or conversations.</p>
            <label className="mt-4 flex items-start gap-3 rounded-2xl bg-[#f5f8fc] p-3 text-sm text-navy">
              <input type="checkbox" className="mt-1 size-4 accent-[#00baf2]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>A notice saying &ldquo;Voice assistant in use at this counter&rdquo; is displayed where customers can see it.</span>
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setAsk(false)}>Not now</Button>
              <Button onClick={aiOn} disabled={!consent}>Turn on</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
