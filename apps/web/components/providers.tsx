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

  const store = useMemo(() => me?.stores.find((s) => s.id === storeId) ?? null, [me, storeId]);

  const value = useMemo(
    () => ({ me, loading, store, refreshMe, selectStore, lang, setLang, t: dict[lang], toast }),
    [me, loading, store, refreshMe, selectStore, lang, setLang, toast],
  );

  return (
    <AppCtx.Provider value={value}>
      {children}
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
