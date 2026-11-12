"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Keyboard, Mic, Square, Trash2, X } from "lucide-react";
import { useApp } from "@/components/providers";
import { Badge, Button, Card, Empty, ErrorNote, Input, PageHeader, Select, Spinner, cx } from "@/components/ui";
import { api, ApiError, newKey, type DemandRequest, type DraftRequest, type Extraction, type Reason } from "@/lib/api";
import { shortDate, titleCase } from "@/lib/format";
import { reasonLabel } from "@/lib/i18n";
import { startRecording, type Recorder } from "@/lib/recorder";
import { useApiData } from "@/lib/useApiData";

type Draft = DraftRequest & { key: string; count: string };

export default function DemandPage() {
  const { store, t, lang, toast } = useApp();
  const ledger = useApiData<DemandRequest[]>("/demand?days=30", store?.id);
  const [phase, setPhase] = useState<"idle" | "recording" | "processing" | "review">("idle");
  const [text, setText] = useState("");
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const rec = useRef<Recorder | null>(null);
  const saveKey = useRef<string>(newKey());
  const [seconds, setSeconds] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const toggleMicStopRef = useRef<(() => Promise<void>) | null>(null);

  async function extract(fd: FormData) {
    try {
      const res = await api<Extraction>("/demand/extract", { form: fd });
      setExtraction(res);
      setDrafts(res.requests.map((r) => ({ ...r, key: newKey(), count: r.ask_count ? String(r.ask_count) : "" })));
      saveKey.current = newKey();
      setPhase("review");
      if (!res.requests.length) setErr("MITRA didn't find a missed customer request in that. Try again, e.g. “5 people asked for rose milk”.");
    } catch (e) {
      setPhase("idle");
      setErr(e instanceof ApiError ? e.message : "Something went wrong.");
    }
  }

  async function toggleMic() {
    setErr(null);
    if (phase === "recording") {
      if (timer.current) clearInterval(timer.current);
      setPhase("processing");
      try {
        const wav = await rec.current!.stop();
        const fd = new FormData();
        fd.append("audio", wav, "note.wav");
        await extract(fd);
      } catch (e) {
        setPhase("idle");
        setErr(e instanceof ApiError ? e.message : "Could not read the recording. Please type it instead.");
      }
      return;
    }
    try {
      rec.current = await startRecording();
      setSeconds(0);
      let elapsed = 0;
      timer.current = setInterval(() => {
        elapsed += 1;
        setSeconds(elapsed);
        if (elapsed >= 60) void toggleMicStopRef.current?.(); // hard stop at 1 minute
      }, 1000);
      setPhase("recording");
    } catch (e) {
      const denied = e instanceof DOMException && e.name === "NotAllowedError";
      setErr(denied ? "Microphone permission was denied. You can type the request below." : (e as Error).message);
    }
  }
  useEffect(() => {
    toggleMicStopRef.current = toggleMic;
  });

  function cancelRecording() {
    if (timer.current) clearInterval(timer.current);
    rec.current?.cancel();
    setPhase("idle");
  }

  async function extractText(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setErr(null);
    setPhase("processing");
    const fd = new FormData();
    fd.append("text", text.trim());
    await extract(fd);
  }

  function addManual() {
    setDrafts((d) => [
      ...d,
      { key: newKey(), raw_item: "", normalized_item: "", ask_count: null, ask_count_explicit: false, reason: "not_stocked", uncertainties: [], requires_review: true, product_id: null, product_name: null, in_stock_qty: null, count: "1" },
    ]);
    if (phase !== "review") {
      setExtraction(null);
      setPhase("review");
    }
  }

  const invalid = drafts.some((d) => !d.normalized_item.trim() || !(Number(d.count) >= 1));

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      await api("/demand", {
        idempotencyKey: saveKey.current,
        body: {
          items: drafts.map((d) => ({ raw_item: d.raw_item || d.normalized_item, normalized_item: d.normalized_item, ask_count: Number(d.count), reason: d.reason, product_id: d.product_id })),
          transcript: extraction?.transcript ?? null,
          language: extraction?.language ?? null,
          extractor: extraction ? extraction.extractor : "manual",
        },
      });
      toast(t.saved);
      setDrafts([]);
      setExtraction(null);
      setText("");
      setPhase("idle");
      void ledger.reload();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function dismiss(r: DemandRequest) {
    try {
      await api(`/demand/${r.id}`, { method: "PATCH", body: { status: "dismissed" } });
      toast("Removed from ledger (kept in activity log)");
      void ledger.reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Could not remove", "err");
    }
  }

  return (
    <div className="rise space-y-6">
      <PageHeader title={t.nav_demand} sub="Every time a customer asks for something you couldn't sell. Takes 5 seconds." />

      <Card className="relative overflow-hidden">
        <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={toggleMic}
              disabled={phase === "processing"}
              aria-label={phase === "recording" ? "Stop recording" : "Start recording a missed request"}
              aria-pressed={phase === "recording"}
              className={cx(
                "flex size-28 items-center justify-center rounded-full border-4 transition-colors disabled:opacity-60",
                phase === "recording" ? "recording border-risk bg-risk/20 text-risk" : "border-signal/40 bg-signal text-white hover:bg-[#00a3e0]",
              )}
            >
              {phase === "recording" ? <Square className="size-9" /> : <Mic className="size-11" />}
            </button>
            <p className="text-sm text-muted" aria-live="polite">
              {phase === "recording" ? `${t.recording} · 0:${String(seconds).padStart(2, "0")}` : phase === "processing" ? t.processing : t.tap_to_speak}
            </p>
            {phase === "recording" && (
              <button onClick={cancelRecording} className="text-xs text-faint underline">Cancel</button>
            )}
          </div>
          <div>
            <p className="mb-2 text-sm text-muted">
              Say it the way you&apos;d tell a friend, in Tamil, Tanglish or English:{" "}
              <span className="text-ink">“Innaiku 8 per mango lassi ketanga, illa nu sonnen.”</span>
            </p>
            <form onSubmit={extractText} className="flex flex-col gap-2 sm:flex-row">
              <label htmlFor="typed" className="sr-only">{t.or_type}</label>
              <Input id="typed" value={text} onChange={(e) => setText(e.target.value)} placeholder={t.type_placeholder} maxLength={2000} />
              <Button type="submit" variant="secondary" loading={phase === "processing" && !!text} disabled={!text.trim() || phase === "recording"}>
                <Keyboard className="size-4" /> {t.read_it}
              </Button>
            </form>
            <button onClick={addManual} className="mt-2 text-xs text-faint underline hover:text-ink">Fill the form myself (no AI)</button>
          </div>
        </div>
        {phase === "processing" && <div className="absolute inset-x-0 bottom-0 h-0.5 animate-pulse bg-signal" />}
      </Card>

      {err && <ErrorNote message={err} />}

      {phase === "review" && drafts.length > 0 && (
        <Card className="rise border-signal/40">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-semibold">{t.review_title}</h2>
              <p className="text-sm text-muted">{t.review_hint}</p>
            </div>
            {extraction && <Badge tone={extraction.extractor.startsWith("gemini") ? "signal" : "caution"}>read by {extraction.extractor}</Badge>}
          </div>
          {extraction?.warning && <p className="mb-3 rounded-lg bg-caution/10 px-3 py-2 text-xs text-caution">{extraction.warning}</p>}
          {extraction?.transcript && (
            <div className="mb-4 rounded-xl border border-line bg-canvas p-3 text-sm">
              <p className="text-xs text-faint">Heard ({extraction.language})</p>
              <p className="mt-1">“{extraction.transcript}”</p>
              {extraction.english_gloss && <p className="mt-1 text-xs text-muted">{extraction.english_gloss}</p>}
            </div>
          )}
          <ul className="space-y-3">
            {drafts.map((d, i) => (
              <li key={d.key} className="grid gap-3 rounded-xl border border-line bg-canvas p-3 sm:grid-cols-[1fr_90px_190px_auto] sm:items-end">
                <label className="block">
                  <span className="text-xs text-faint">{t.item}</span>
                  <Input value={d.normalized_item} onChange={(e) => setDrafts((ds) => ds.map((x, j) => (j === i ? { ...x, normalized_item: e.target.value } : x)))} placeholder="e.g. rose milk" />
                </label>
                <label className="block">
                  <span className="text-xs text-faint">{t.asks}</span>
                  <Input
                    type="number" min={1} max={500} inputMode="numeric" value={d.count}
                    aria-invalid={!(Number(d.count) >= 1)}
                    className={cx(!d.ask_count_explicit && "border-caution")}
                    onChange={(e) => setDrafts((ds) => ds.map((x, j) => (j === i ? { ...x, count: e.target.value } : x)))}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-faint">{t.reason}</span>
                  <Select value={d.reason} onChange={(e) => setDrafts((ds) => ds.map((x, j) => (j === i ? { ...x, reason: e.target.value as Reason } : x)))}>
                    {Object.entries(reasonLabel[lang]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                </label>
                <button aria-label="Remove this item" onClick={() => setDrafts((ds) => ds.filter((_, j) => j !== i))} className="h-10 rounded-lg px-2 text-faint hover:text-risk">
                  <X className="size-4" />
                </button>
                <div className="flex flex-wrap gap-1.5 sm:col-span-4">
                  {d.product_name ? <Badge tone="success">matches catalog: {d.product_name}{d.in_stock_qty !== null ? ` · ${d.in_stock_qty} in stock` : ""}</Badge> : <Badge>not in catalog yet</Badge>}
                  {d.uncertainties.map((u) => <Badge key={u} tone="caution"><AlertTriangle className="size-3" /> {u}</Badge>)}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="success" onClick={save} loading={saving} disabled={invalid}><Check className="size-4" /> {t.confirm_save}</Button>
            <Button variant="ghost" onClick={addManual}>+ Add item</Button>
            <Button variant="ghost" onClick={() => { setDrafts([]); setExtraction(null); setPhase("idle"); }}>{t.discard}</Button>
          </div>
          {invalid && <p className="mt-2 text-xs text-caution">Every item needs a name and the number of customers who asked.</p>}
        </Card>
      )}

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">{t.ledger} · 30 days</h2>
          {ledger.data && <span className="num text-sm text-muted">{ledger.data.reduce((a, r) => a + r.ask_count, 0)} asks</span>}
        </div>
        {ledger.loading && !ledger.data ? (
          <Spinner />
        ) : ledger.error ? (
          <ErrorNote message={ledger.error} onRetry={ledger.reload} />
        ) : !ledger.data?.length ? (
          <Empty icon={<Mic className="size-6" />} title="No missed requests yet" body="Tap the mic the next time a customer asks for something you don’t have." />
        ) : (
          <ul className="divide-y divide-line">
            {ledger.data.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="num w-10 shrink-0 rounded-lg bg-raised py-1 text-center font-semibold">×{r.ask_count}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{titleCase(r.normalized_item)}</p>
                  <p className="truncate text-xs text-faint">
                    {reasonLabel[lang][r.reason]} · {shortDate(r.requested_at)}
                    {r.transcript ? ` · “${r.transcript.slice(0, 60)}”` : ""}
                  </p>
                </div>
                {r.source_type === "sample_seed" ? <Badge tone="caution">{t.sample}</Badge> : r.source_type === "ai_extracted_confirmed" ? <Badge tone="signal">voice/AI · confirmed</Badge> : <Badge>typed</Badge>}
                <button aria-label={`Remove ${r.normalized_item}`} onClick={() => dismiss(r)} className="rounded-lg p-1.5 text-faint hover:text-risk"><Trash2 className="size-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
