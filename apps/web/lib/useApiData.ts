"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "./api";

const msg = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong.");

/** Minimal fetch hook: loading / error / data / reload. Re-fetches when `path` or `key` (e.g. store id) changes. */
export function useApiData<T>(path: string | null, key: unknown = null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(!!path);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    api<T>(path)
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setError(null);
        }
      })
      .catch((e) => !cancelled && setError(msg(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [path, key]);

  const reload = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try {
      setData(await api<T>(path));
      setError(null);
    } catch (e) {
      setError(msg(e));
    } finally {
      setLoading(false);
    }
  }, [path]);

  return { data, error, loading, reload, setData };
}
