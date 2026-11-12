"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { useApp } from "@/components/providers";
import { Button, Field, Input, Select } from "@/components/ui";
import { api, ApiError } from "@/lib/api";

export default function Onboarding() {
  const router = useRouter();
  const { refreshMe, selectStore, setLang, me } = useApp();
  const [name, setName] = useState("");
  const [city, setCity] = useState("Chennai");
  const [category, setCategory] = useState("kirana");
  const [language, setLanguage] = useState<"ta" | "en">("ta");
  const [budget, setBudget] = useState("2000");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const s = await api<{ id: string }>("/stores", {
        body: { name, city, category, language, trial_budget: budget ? budget : null },
      });
      selectStore(s.id);
      setLang(language);
      await refreshMe();
      router.replace("/app/catalog?first=1");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the store.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid-bg flex min-h-screen items-center justify-center px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-3xl border border-line bg-surface p-7 shadow-2xl">
        <Logo />
        <div>
          <h1 className="text-xl font-semibold">Set up your shop{me ? `, ${me.user.name.split(" ")[0]}` : ""}</h1>
          <p className="mt-1 text-sm text-muted">You can change all of this later.</p>
        </div>
        <Field label="Shop name">
          <Input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder="Murugan Stores" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Area / city">
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </Field>
          <Field label="Type of shop">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="kirana">Kirana / general</option>
              <option value="beverages">Juice & drinks</option>
              <option value="bakery">Bakery / sweets</option>
              <option value="stationery">Stationery</option>
              <option value="cafe">Café / tea stall</option>
              <option value="other">Other</option>
            </Select>
          </Field>
        </div>
        <Field label="Main language">
          <Select value={language} onChange={(e) => setLanguage(e.target.value as "ta" | "en")}>
            <option value="ta">தமிழ் (Tamil)</option>
            <option value="en">English</option>
          </Select>
        </Field>
        <Field label="Max money for one stocking trial (₹)" hint="MITRA will never suggest a trial that costs more than this.">
          <Input type="number" min={0} step="1" inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value)} />
        </Field>
        {error && <p role="alert" className="text-sm text-risk">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={busy}>Create shop</Button>
      </form>
    </div>
  );
}
