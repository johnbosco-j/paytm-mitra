"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Select } from "./ui";

export type Lang = { code: string; name: string; english: string; scheduled: boolean; cloud: boolean; offline_stt: boolean; offline_llm: boolean };

let cache: Lang[] | null = null;

/** India's 22 scheduled languages + English + code-mixes, from the API (single source of truth). */
export function useLanguages() {
  const [langs, setLangs] = useState<Lang[] | null>(cache);
  useEffect(() => {
    if (cache) return;
    api<{ languages: Lang[] }>("/languages")
      .then((r) => { cache = r.languages; setLangs(r.languages); })
      .catch(() => setLangs([]));
  }, []);
  return langs;
}

export function languageLabel(langs: Lang[] | null, code: string | null | undefined) {
  const l = langs?.find((x) => x.code === code);
  return l ? (l.name === l.english ? l.english : `${l.english} · ${l.name}`) : (code ?? "");
}

export function LanguagePicker({ value, onChange, id, disabled, className }: { value: string; onChange: (code: string) => void; id?: string; disabled?: boolean; className?: string }) {
  const langs = useLanguages();
  const opt = (l: Lang) => (
    <option key={l.code} value={l.code}>
      {l.name === l.english ? l.english : `${l.name} · ${l.english}`}
      {l.offline_stt ? "" : " (voice needs internet)"}
    </option>
  );
  return (
    <Select id={id} value={value} disabled={disabled || !langs} onChange={(e) => onChange(e.target.value)} className={className} aria-label="Language">
      {!langs?.length && <option value={value}>{value}</option>}
      {langs && langs.length > 0 && (
        <>
          <optgroup label="22 scheduled languages of India">{langs.filter((l) => l.scheduled).map(opt)}</optgroup>
          <optgroup label="English and code-mix">{langs.filter((l) => !l.scheduled).map(opt)}</optgroup>
        </>
      )}
    </Select>
  );
}
