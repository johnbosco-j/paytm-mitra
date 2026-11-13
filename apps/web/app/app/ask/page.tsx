"use client";

import { useState } from "react";
import { MessageCircleQuestion, Send, Volume2 } from "lucide-react";
import { useApp } from "@/components/providers";
import { Badge, Button, Card, Input, PageHeader } from "@/components/ui";
import { api, ApiError } from "@/lib/api";

type Msg = { q: string; a?: string; model?: string; error?: string };

const SUGGESTIONS = [
  "இந்த வாரம் அதிகம் கேட்கப்பட்டது எது?",
  "Which item should I try stocking first, and how much money do I need?",
  "Rose milk-ku enna panna vendum?",
  "How did my last trial do?",
];

/** Speak an answer: natural cloud voice when online, the device's own Tamil/English voice offline. */
async function speakText(text: string, setBusy: (b: boolean) => void) {
  setBusy(true);
  try {
    const res = await fetch("/api/speak", { method: "POST", headers: { "Content-Type": "application/json", "X-Store-Id": localStorage.getItem("mitra.store") ?? "" }, body: JSON.stringify({ text: text.slice(0, 600) }) });
    if (!res.ok) throw new Error("cloud voice unavailable");
    const url = URL.createObjectURL(await res.blob());
    const audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    await audio.play();
  } catch {
    const u = new SpeechSynthesisUtterance(text);
    const tamil = /[\u0B80-\u0BFF]/.test(text);
    u.lang = tamil ? "ta-IN" : "en-IN";
    const v = speechSynthesis.getVoices().find((x) => x.lang.replace("_", "-").startsWith(u.lang));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  } finally {
    setBusy(false);
  }
}

export default function AskPage() {
  const { t, store } = useApp();
  const [q, setQ] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  async function ask(question: string) {
    if (!question.trim() || busy) return;
    setBusy(true);
    setQ("");
    setMsgs((m) => [...m, { q: question }]);
    try {
      const r = await api<{ answer: string; model: string }>("/ask", { body: { question } });
      setMsgs((m) => m.map((x, i) => (i === m.length - 1 ? { ...x, a: r.answer, model: r.model } : x)));
    } catch (e) {
      setMsgs((m) => m.map((x, i) => (i === m.length - 1 ? { ...x, error: e instanceof ApiError ? e.message : "Failed" } : x)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rise space-y-6">
      <PageHeader title={t.nav_ask} sub={`Answers only from ${store?.name ?? "your shop"}'s own records: missed asks, catalog and trials. It can't send, buy or change anything.`} />
      <Card>
        {msgs.length === 0 && (
          <div className="mb-4">
            <p className="mb-2 text-sm text-muted">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => ask(s)} className="rounded-full border border-line bg-canvas px-3 py-1.5 text-sm hover:border-signal/50">{s}</button>
              ))}
            </div>
          </div>
        )}
        <ul className="space-y-4" aria-live="polite">
          {msgs.map((m, i) => (
            <li key={i} className="space-y-2">
              <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-signal/15 px-4 py-2 text-sm">{m.q}</p>
              <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-line bg-canvas px-4 py-3 text-sm">
                {m.a ? (
                  <>
                    <p className="whitespace-pre-wrap">{m.a}</p>
                    <p className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge>grounded on store records · {m.model}</Badge>
                      <button onClick={() => speakText(m.a!, setSpeaking)} disabled={speaking} className="inline-flex items-center gap-1 rounded-full bg-[#e6f6fd] px-3 py-1 text-xs font-bold text-navy hover:bg-[#d4effb] disabled:opacity-50">
                        <Volume2 className="size-3.5" /> {speaking ? "Speaking…" : "Hear it"}
                      </button>
                    </p>
                  </>
                ) : m.error ? (
                  <p className="text-risk">{m.error}</p>
                ) : (
                  <p className="text-muted">Looking at your records…</p>
                )}
              </div>
            </li>
          ))}
        </ul>
        <form onSubmit={(e) => { e.preventDefault(); void ask(q); }} className="mt-4 flex gap-2">
          <label htmlFor="ask" className="sr-only">Question</label>
          <Input id="ask" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.ask_placeholder} maxLength={500} />
          <Button type="submit" loading={busy} disabled={!q.trim()} aria-label={t.ask_send}><Send className="size-4" /></Button>
        </form>
        {msgs.length === 0 && <p className="mt-3 flex items-center gap-2 text-xs text-faint"><MessageCircleQuestion className="size-3.5" /> Numbers in answers come from MITRA’s calculations, not the AI.</p>}
      </Card>
    </div>
  );
}
