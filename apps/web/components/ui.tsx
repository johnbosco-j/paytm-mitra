"use client";

import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
};

export function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...rest }: BtnProps) {
  const v = {
    primary: "bg-signal text-white hover:bg-[#00a3e0] font-semibold shadow-[0_6px_16px_rgba(0,186,242,0.28)]",
    secondary: "bg-white text-navy border border-[#cfe3f5] hover:border-signal font-semibold",
    ghost: "text-muted hover:text-ink hover:bg-raised",
    danger: "bg-transparent text-risk border border-risk/50 hover:bg-risk/10",
    success: "bg-success text-white hover:bg-[#0e8a44] font-semibold",
  }[variant];
  const s = { sm: "h-8 px-3 text-sm", md: "h-10 px-4 text-sm", lg: "h-12 px-5 text-base" }[size];
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50",
        v,
        s,
        className,
      )}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  // min-w-0: cards are often grid children; without it a wide table or chart inside stretches the grid past the phone width
  return <section className={cx("min-w-0 rounded-2xl border border-line bg-surface p-5 shadow-[0_2px_12px_rgba(16,40,80,0.05)]", className)}>{children}</section>;
}

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: "neutral" | "signal" | "success" | "caution" | "risk";
  children: ReactNode;
  className?: string;
}) {
  const t = {
    neutral: "bg-raised text-muted border-line",
    signal: "bg-signal/10 text-signal border-signal/30",
    success: "bg-success/10 text-success border-success/30",
    caution: "bg-caution/10 text-caution border-caution/30",
    risk: "bg-risk/10 text-risk border-risk/30",
  }[tone];
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium", t, className)}>
      {children}
    </span>
  );
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
      {error ? <span className="block text-xs text-risk">{error}</span> : hint ? <span className="block text-xs text-faint">{hint}</span> : null}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-[#d5deea] bg-white px-3 py-2.5 text-sm text-ink placeholder:text-faint focus:border-signal focus:ring-2 focus:ring-signal/20 focus:outline-none";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputCls, props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(inputCls, "appearance-none", props.className)} />;
}

export function Empty({ icon, title, body, action }: { icon?: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      {icon && <div className="mb-3 text-faint">{icon}</div>}
      <p className="font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-10 text-sm text-muted" role="status">
      <Loader2 className="size-4 animate-spin" aria-hidden /> {label}…
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-risk/40 bg-risk/5 px-4 py-3 text-sm">
      <span>{message}</span>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: string; tone?: "signal" | "success" }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-[0_2px_12px_rgba(16,40,80,0.05)]">
      <p className="text-xs text-muted">{label}</p>
      <p className={cx("num mt-1 text-2xl font-semibold", tone === "signal" && "text-signal", tone === "success" && "text-success")}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-faint">{sub}</p>}
    </div>
  );
}

export function PageHeader({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export { cx };
