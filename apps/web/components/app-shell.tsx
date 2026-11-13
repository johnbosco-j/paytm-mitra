"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  Bell,
  ChevronDown,
  FlaskConical,
  HeartPulse,
  Home,
  IndianRupee,
  ScanLine,
  Languages,
  LogOut,
  MessageCircleQuestion,
  Mic,
  Package,
  ScrollText,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  WifiOff,
} from "lucide-react";
import { api } from "@/lib/api";
import { useApp } from "./providers";
import { Spinner, cx } from "./ui";

const NAV = [
  { href: "/app", key: "nav_home", icon: Home },
  { href: "/app/demand", key: "nav_demand", icon: Mic },
  { href: "/app/opportunities", key: "nav_opps", icon: Sparkles },
  { href: "/app/trials", key: "nav_trials", icon: FlaskConical },
  { href: "/app/preorders", key: "nav_preorders", icon: ShoppingBag },
  { href: "/app/insights", key: "nav_insights", icon: HeartPulse },
  { href: "/app/sales", key: "nav_sales", icon: IndianRupee },
  { href: "/app/shelf", key: "nav_shelf", icon: ScanLine },
  { href: "/app/catalog", key: "nav_catalog", icon: Package },
  { href: "/app/ask", key: "nav_ask", icon: MessageCircleQuestion },
  { href: "/app/activity", key: "nav_activity", icon: Activity },
  { href: "/app/team", key: "nav_team", icon: Settings },
] as const;

export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className={cx("grid size-9 place-items-center rounded-xl text-[15px] font-black", light ? "bg-white text-navy" : "bg-navy text-white")}>M</span>
      <span className="leading-tight">
        <span className={cx("block text-[17px] font-extrabold tracking-tight", light ? "text-white" : "text-navy")}>MITRA</span>
        <span className={cx("block text-[10px] font-semibold", light ? "text-[#9fe3fb]" : "text-signal")}>for Paytm merchants</span>
      </span>
    </span>
  );
}

function useOfflineState() {
  const [offline, setOffline] = useState<null | { mode: string; local: boolean }>(null);
  const { store } = useApp();
  useEffect(() => {
    if (!store) return;
    let alive = true;
    api<{ ai_mode: string; offline_model: { available: boolean } }>("/integrations")
      .then((r) => alive && setOffline({ mode: r.ai_mode, local: r.offline_model.available }))
      .catch(() => null);
    return () => {
      alive = false;
    };
  }, [store]);
  return offline;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { me, loading, store, selectStore, t, lang, setLang, refreshMe } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const ai = useOfflineState();

  useEffect(() => {
    if (loading) return;
    if (!me) router.replace("/login");
    else if (me.stores.length === 0) router.replace("/onboarding");
  }, [loading, me, router]);

  if (loading || !me || !store) return <div className="mx-auto max-w-md px-6"><Spinner label="Opening your shop" /></div>;

  const signOut = async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => null);
    await refreshMe();
    router.replace("/login");
  };
  const isActive = (href: string) => (href === "/app" ? pathname === "/app" : pathname.startsWith(href));
  const initials = me.user.name.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-canvas md:grid md:grid-cols-[256px_1fr]">
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-white md:flex">
        <div className="px-5 pt-5 pb-4"><Link href="/"><Wordmark /></Link></div>
        <div className="px-4">
          <label className="relative block">
            <span className="sr-only">Store</span>
            <select value={store.id} onChange={(e) => selectStore(e.target.value)} className="w-full appearance-none rounded-xl border border-line bg-[#f7fafd] py-2.5 pr-8 pl-3 text-sm font-semibold text-navy">
              {me.stores.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.role}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute top-3 right-2.5 size-4 text-faint" />
          </label>
        </div>
        <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-3" aria-label="Main">
          {NAV.map(({ href, key, icon: Icon }) => (
            <Link key={href} href={href} className={cx("flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold transition-colors", isActive(href) ? "bg-[#e6f6fd] text-navy" : "text-[#4a5568] hover:bg-[#f3f7fb]")}>
              <span className={cx("grid size-8 place-items-center rounded-lg", isActive(href) ? "bg-signal text-white" : "bg-[#eef4fa] text-navy")}><Icon className="size-4" aria-hidden /></span>
              {t[key]}
            </Link>
          ))}
        </nav>
        <div className="space-y-2 border-t border-line p-4">
          {ai && (
            <div className={cx("flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold", ai.local ? "bg-[#e8f8ef] text-[#0e7a3d]" : "bg-[#f3f6fa] text-muted")}>
              <WifiOff className="size-3.5" /> MITRA-Lite {ai.local ? "ready offline" : "not running"}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => setLang(lang === "en" ? "ta" : "en")} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line py-2 text-xs font-semibold text-navy hover:bg-[#f3f7fb]">
              <Languages className="size-3.5" /> {t.language}
            </button>
            <button onClick={signOut} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line py-2 text-xs font-semibold text-navy hover:bg-[#f3f7fb]">
              <LogOut className="size-3.5" /> {t.signout}
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        {/* top bar (desktop) / header (mobile) */}
        <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 md:px-8">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#002e6e] to-[#0062c4] text-xs font-bold text-white md:hidden">{initials}</span>
            <div className="min-w-0 flex-1 md:hidden">
              <p className="truncate text-[15px] font-bold text-navy">{store.name}</p>
              <p className="text-[11px] text-faint">{store.role === "owner" ? "Owner" : "Staff"} · {me.user.name}</p>
            </div>
            <Link href="/app/ask" className="hidden flex-1 items-center gap-2 rounded-full border border-line bg-[#f5f8fc] px-4 py-2.5 text-sm text-faint hover:border-signal md:flex">
              <Search className="size-4" /> Ask MITRA about your shop, in your language…
            </Link>
            <button aria-label="Switch language" onClick={() => setLang(lang === "en" ? "ta" : "en")} className="rounded-full px-2.5 py-1.5 text-xs font-bold text-navy hover:bg-[#f3f7fb] md:hidden">{t.language}</button>
            <Link href="/app/activity" aria-label="Activity" className="relative grid size-9 place-items-center rounded-full text-navy hover:bg-[#f3f7fb]">
              <Bell className="size-5" />
            </Link>
            <span className="hidden items-center gap-2 rounded-full border border-line py-1 pr-3 pl-1 md:flex">
              <span className="grid size-7 place-items-center rounded-full bg-navy text-[11px] font-bold text-white">{initials}</span>
              <span className="text-sm font-semibold text-navy">{me.user.name.split(" ")[0]}</span>
            </span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 pt-5 pb-32 md:px-8 md:pb-12">{children}</main>
        <p className="px-4 pb-28 text-center text-[11px] text-faint md:pb-6">
          MITRA is a hackathon prototype for the Paytm Build for India AI Hackathon. Not an official Paytm product or integration.
        </p>
      </div>

      {/* mobile bottom bar with the raised centre action, as in Paytm's apps */}
      <nav aria-label="Main mobile" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white md:hidden">
        <div className="relative grid grid-cols-5 items-end pb-[max(env(safe-area-inset-bottom),6px)]">
          {[
            { href: "/app", label: t.nav_home, icon: Home },
            { href: "/app/opportunities", label: t.tab_opps, icon: Sparkles },
            { href: "/app/demand", label: "Speak", icon: Mic, center: true },
            { href: "/app/trials", label: t.nav_trials, icon: FlaskConical },
            { href: "/app/preorders", label: t.tab_preorders, icon: ScrollText },
          ].map(({ href, label, icon: Icon, center }) =>
            center ? (
              <Link key={href} href={href} className="flex flex-col items-center gap-1 pb-1.5">
                <span className="-mt-7 grid size-[60px] place-items-center rounded-full border-4 border-white bg-signal text-white shadow-[0_8px_20px_rgba(0,186,242,0.45)]">
                  <Icon className="size-7" />
                </span>
                <span className="text-[11px] font-bold text-navy">{label}</span>
              </Link>
            ) : (
              <Link key={href} href={href} className={cx("flex flex-col items-center gap-1 pt-2.5 pb-1.5 text-[11px] font-semibold", isActive(href) ? "text-signal" : "text-[#6b7480]")}>
                <Icon className="size-[22px]" aria-hidden />
                <span className="max-w-full truncate px-1">{label}</span>
              </Link>
            ),
          )}
        </div>
      </nav>
    </div>
  );
}
