"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, CircleSlash, Cloud, Link2, LogOut, Plus, QrCode, ShieldCheck, WifiOff } from "lucide-react";
import { useApp } from "@/components/providers";
import { Badge, Button, Card, ErrorNote, Field, Input, PageHeader, Spinner, cx } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { rupees } from "@/lib/format";
import { useApiData } from "@/lib/useApiData";

type Member = { id: string; name: string; email: string; role: string };
type StoreInfo = { id: string; name: string; city: string; language: string; trial_budget: string | null; role: string; upi_vpa: string | null; ai_mode: "auto" | "offline" };
type Integrations = { paytm_links: { connected: boolean }; upi_qr: { configured: boolean }; offline_model: { available: boolean; model?: string; speech?: boolean }; cloud_ai: boolean; ai_mode: string };

function Status({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <li className="flex items-start gap-3 py-3">
      {ok ? <CheckCircle2 className="mt-0.5 size-5 text-success" /> : <CircleSlash className="mt-0.5 size-5 text-faint" />}
      <span className="flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-muted">{detail}</span>
      </span>
      <Badge tone={ok ? "success" : "neutral"}>{ok ? "on" : "off"}</Badge>
    </li>
  );
}

export default function TeamPage() {
  const { store, toast, refreshMe } = useApp();
  const router = useRouter();
  const owner = store?.role === "owner";
  const info = useApiData<StoreInfo>("/store", store?.id);
  const integ = useApiData<Integrations>("/integrations", store?.id);
  const members = useApiData<Member[]>(owner ? "/store/members" : null, store?.id);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [edit, setEdit] = useState<{ trial_budget?: string; upi_vpa?: string }>({});
  const [busy, setBusy] = useState(false);

  async function patch(body: Record<string, unknown>, msg: string) {
    try {
      await api("/store", { method: "PATCH", body });
      toast(msg);
      setEdit({});
      void info.reload();
      void integ.reload();
      void refreshMe();
    } catch (err) {
      toast(err instanceof ApiError ? (err.details?.[0]?.message ?? err.message) : "Failed", "err");
    }
  }

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/store/members", { body: { ...form, role: "staff" } });
      toast(`${form.name} can now sign in as staff`);
      setForm({ name: "", email: "", password: "" });
      void members.reload();
    } catch (err) {
      toast(err instanceof ApiError ? (err.details?.[0]?.message ?? err.message) : "Failed", "err");
    } finally {
      setBusy(false);
    }
  }

  async function logoutAll() {
    await api("/auth/logout-all", { method: "POST" }).catch(() => null);
    await refreshMe();
    router.replace("/login");
  }

  if (info.loading && !info.data) return <Spinner />;
  if (info.error) return <ErrorNote message={info.error} onRetry={info.reload} />;
  const s = info.data!;
  const i = integ.data;

  return (
    <div className="rise space-y-6">
      <PageHeader title="Store & settings" sub="Staff can log demand and record stock. Only owners approve spending, change prices and see customer numbers." right={<Link href="/onboarding" className="text-sm font-semibold text-signal">+ New store</Link>} />

      <div id="settings" className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-1 text-[16px] font-bold text-navy">{s.name}</h2>
          <p className="mb-4 text-sm text-muted">{s.city} · language {s.language} · you are <Badge>{s.role}</Badge></p>
          <div className="space-y-4">
            <div className="flex items-end gap-2">
              <Field label="Max money per trial (₹)" hint="MITRA never suggests a trial above this.">
                <Input type="number" min={0} disabled={!owner} value={edit.trial_budget ?? s.trial_budget ?? ""} onChange={(e) => setEdit({ ...edit, trial_budget: e.target.value })} placeholder="no limit" />
              </Field>
              {owner && edit.trial_budget !== undefined && <Button onClick={() => patch({ trial_budget: edit.trial_budget || null }, "Trial budget saved")}>Save</Button>}
            </div>
            <div className="flex items-end gap-2">
              <Field label="Shop UPI ID" hint="Used for the pre-order payment QR, e.g. murugan@okaxis">
                <Input disabled={!owner} value={edit.upi_vpa ?? s.upi_vpa ?? ""} onChange={(e) => setEdit({ ...edit, upi_vpa: e.target.value })} placeholder="yourname@bank" />
              </Field>
              {owner && edit.upi_vpa !== undefined && <Button onClick={() => patch({ upi_vpa: edit.upi_vpa || null }, "UPI ID saved")}>Save</Button>}
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium">AI mode</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { v: "auto", icon: Cloud, t: "Best available", d: "Cloud AI, falls back to MITRA-Lite" },
                  { v: "offline", icon: WifiOff, t: "Offline only", d: "Notes never leave this device" },
                ] as const).map(({ v, icon: Icon, t, d }) => (
                  <button key={v} disabled={!owner} onClick={() => patch({ ai_mode: v }, v === "offline" ? "Offline mode on: MITRA-Lite only" : "Best-available AI on")}
                    className={cx("rounded-2xl border p-3 text-left transition", s.ai_mode === v ? "border-signal bg-[#e6f6fd]" : "border-line hover:border-[#cfe3f5]")}>
                    <Icon className="mb-1 size-5 text-navy" />
                    <span className="block text-sm font-bold text-navy">{t}</span>
                    <span className="block text-xs text-muted">{d}</span>
                  </button>
                ))}
              </div>
            </div>
            {!owner && s.trial_budget && <p className="text-xs text-faint">Trial budget: {rupees(s.trial_budget)}</p>}
          </div>
        </Card>

        <Card>
          <h2 className="mb-1 text-[16px] font-bold text-navy">Connections</h2>
          <p className="text-sm text-muted">What MITRA can use right now.</p>
          {i ? (
            <ul className="divide-y divide-line">
              <Status ok={i.offline_model.available} label="MITRA-Lite (offline model)" detail={i.offline_model.available ? `Running on this device${i.offline_model.model ? ` · ${i.offline_model.model}` : ""}${i.offline_model.speech ? " · speech" : " · text only"}` : "Start it with scripts/dev-ml.sh to work without internet."} />
              <Status ok={i.cloud_ai} label="Cloud AI (Gemini)" detail={i.cloud_ai ? "Tamil voice + extraction, with automatic failover" : "No key configured"} />
              <Status ok={i.paytm_links.connected} label="Paytm Payment Links" detail={i.paytm_links.connected ? "Staging credentials found" : "Add PAYTM staging MID and key in services/api/.env (owner's machine only)"} />
              <Status ok={i.upi_qr.configured} label="UPI QR for pre-orders" detail={i.upi_qr.configured ? "Customers can scan to pay" : "Add your shop UPI ID"} />
            </ul>
          ) : <Spinner />}
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-faint"><ShieldCheck className="size-3.5" /> The prototype never reads Paytm account data. Links are created only when you take a pre-order.</p>
        </Card>
      </div>

      {owner && (
        <Card>
          <h2 className="mb-3 text-[16px] font-bold text-navy">People</h2>
          {members.data && (
            <ul className="mb-4 divide-y divide-line text-sm">
              {members.data.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-3">
                    <span className="grid size-8 place-items-center rounded-full bg-[#e6f6fd] text-xs font-bold text-navy">{m.name[0]}</span>
                    <span>{m.name} <span className="text-faint">· {m.email}</span></span>
                  </span>
                  <Badge tone={m.role === "owner" ? "signal" : "neutral"}>{m.role}</Badge>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={addMember} className="grid gap-3 md:grid-cols-4">
            <Field label="Staff name"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Email"><Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Temporary password" hint="8+ characters, not a common one"><Input required minLength={8} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
            <div className="flex items-end"><Button type="submit" loading={busy} className="w-full"><Plus className="size-4" /> Add staff</Button></div>
          </form>
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-bold text-navy">Security</h2>
            <p className="text-sm text-muted">Lost a phone? Sign out of MITRA on every device at once.</p>
          </div>
          <Button variant="danger" onClick={logoutAll}><LogOut className="size-4" /> Sign out everywhere</Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#f5f8fc] px-3 py-1"><QrCode className="size-3.5" /> Customer numbers encrypted</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#f5f8fc] px-3 py-1"><ShieldCheck className="size-3.5" /> Login lockout + rate limits</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#f5f8fc] px-3 py-1"><Link2 className="size-3.5" /> Every action audited</span>
        </div>
      </Card>
    </div>
  );
}
