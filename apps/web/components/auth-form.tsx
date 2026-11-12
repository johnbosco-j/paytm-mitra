"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError, type Me } from "@/lib/api";
import { Logo } from "./logo";
import { useApp } from "./providers";
import { Button, Field, Input } from "./ui";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const { refreshMe } = useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const me = await api<Me>(`/auth/${mode}`, { body: mode === "signup" ? { name, email, password } : { email, password } });
      await refreshMe();
      router.replace(me.stores.length ? "/app" : "/onboarding");
    } catch (err) {
      setError(err instanceof ApiError ? (err.details?.[0] ? `${err.details[0].field}: ${err.details[0].message}` : err.message) : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid-bg flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-3xl border border-line bg-surface p-7 shadow-2xl">
        <Link href="/"><Logo /></Link>
        <div>
          <h1 className="text-xl font-semibold">{mode === "login" ? "Welcome back" : "Create your shop account"}</h1>
          <p className="mt-1 text-sm text-muted">{mode === "login" ? "Sign in to your shop." : "Takes under a minute. No payment details needed."}</p>
        </div>
        {mode === "signup" && (
          <Field label="Your name">
            <Input required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </Field>
        )}
        <Field label="Email">
          <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </Field>
        <Field label="Password" hint={mode === "signup" ? "At least 8 characters." : undefined}>
          <Input required type="password" minLength={mode === "signup" ? 8 : 1} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} />
        </Field>
        {error && <p role="alert" className="text-sm text-risk">{error}</p>}
        <Button type="submit" loading={busy} className="w-full" size="lg">
          {mode === "login" ? "Sign in" : "Create account"}
        </Button>
        <p className="text-center text-sm text-muted">
          {mode === "login" ? (
            <>New here? <Link className="text-signal" href="/signup">Create an account</Link></>
          ) : (
            <>Have an account? <Link className="text-signal" href="/login">Sign in</Link></>
          )}
        </p>
      </form>
    </div>
  );
}
