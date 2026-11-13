"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, ApiError, getStoreId, setStoreId, type Me, type StoreRef } from "@/lib/api";
import { dict, type Dict, type Lang } from "@/lib/i18n";

type Toast = { id: number; text: string; tone: "ok" | "err" };

type Ctx = {
  me: Me | null;
  loading: boolean;
  store: StoreRef | null;
  refreshMe: () => Promise<Me | null>;
  selectStore: (id: string) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Dict;
  toast: (text: string, tone?: "ok" | "err") => void;
  /** Confetti burst + a warm banner for real wins (trial sold through, pre-order paid). */
  celebrate: (title: string, sub?: string) => void;
};

const AppCtx = createContext<Ctx | null>(null);

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp outside Providers");
  return c;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [storeId, setSid] = useState<string | null>(null);
  const [lang, setLangState] = useState<Lang>("en");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [party, setParty] = useState<{ id: number; title: string; sub?: string } | null>(null);

  const refreshMe = useCallback(async () => {
    try {
      const m = await api<Me | { user: null; stores: [] }>("/session");
      if (!m.user) {
        setMe(null);
        setStoreId(null);
        setSid(null);
        return null;
      }
      setMe(m as Me);
      const saved = getStoreId();
      const pick = m.stores.find((s) => s.id === saved) ?? m.stores[0] ?? null;
      setStoreId(pick?.id ?? null);
      setSid(pick?.id ?? null);
      return m as Me;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setMe(null);
        setStoreId(null);
        setSid(null);
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const l = localStorage.getItem("mitra.lang");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe: read persisted language after mount
      if (l === "ta" || l === "en") setLangState(l);
    } catch {
      /* ignore */
    }
    void refreshMe();
    // installable, offline-capable app shell (production builds; dev keeps hot reload uncached)
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") void navigator.serviceWorker.register("/sw.js").catch(() => null);
  }, [refreshMe]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("mitra.lang", l);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = l;
  }, []);

  const selectStore = useCallback((id: string) => {
    setStoreId(id);
    setSid(id);
  }, []);

  const toast = useCallback((text: string, tone: "ok" | "err" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts, { id, text, tone }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 4200);
  }, []);

  const celebrate = useCallback((title: string, sub?: string) => {
    const id = Date.now();
    setParty({ id, title, sub });
    try { navigator.vibrate?.([30, 40, 60]); } catch { /* not supported */ }
    setTimeout(() => setParty((p) => (p?.id === id ? null : p)), 3800);
  }, []);

  const store = useMemo(() => me?.stores.find((s) => s.id === storeId) ?? null, [me, storeId]);

  const value = useMemo(
    () => ({ me, loading, store, refreshMe, selectStore, lang, setLang, t: dict[lang], toast, celebrate }),
    [me, loading, store, refreshMe, selectStore, lang, setLang, toast, celebrate],
  );

  return (
    <AppCtx.Provider value={value}>
      {children}
      {party && <Celebration key={party.id} title={party.title} sub={party.sub} />}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`rise pointer-events-auto max-w-md rounded-xl border px-4 py-3 text-sm shadow-xl ${
              t.tone === "ok" ? "border-success/40 bg-white text-ink" : "border-risk/50 bg-white text-ink"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </AppCtx.Provider>
  );
}

const CONFETTI = ["#00baf2", "#002e6e", "#ffd400", "#21c17a", "#ff6b6b", "#ffffff"];

/** Deterministic confetti layout (no Math.random in render): 70 pieces spread by a golden-ratio walk. */
const PIECES = Array.from({ length: 70 }, (_, i) => ({
  left: ((i * 61.8) % 100).toFixed(2),
  delay: ((i * 37) % 900) / 1000,
  dur: 1.8 + ((i * 53) % 140) / 100,
  w: 6 + (i % 4) * 2,
  color: CONFETTI[i % CONFETTI.length],
  round: i % 3 === 0,
}));

function Celebration({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden motion-reduce:hidden" aria-hidden>
      {PIECES.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 block"
          style={{
            left: `${p.left}%`, width: p.w, height: p.round ? p.w : p.w * 1.6, background: p.color,
            borderRadius: p.round ? 999 : 2, animation: `confetti-fall ${p.dur}s cubic-bezier(.2,.6,.4,1) ${p.delay}s both`,
          }}
        />
      ))}
      <div className="absolute inset-x-0 top-[18%] flex justify-center px-4">
        <div className="pop-in rounded-3xl bg-white/95 px-7 py-5 text-center shadow-[0_24px_60px_rgba(0,46,110,0.35)] backdrop-blur">
          <p className="text-4xl">🎉</p>
          <p className="font-display mt-1 text-xl font-black text-[#002e6e]">{title}</p>
          {sub && <p className="mt-1 max-w-xs text-sm text-[#4a5568]">{sub}</p>}
        </div>
      </div>
    </div>
  );
}
