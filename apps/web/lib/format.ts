const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const inr0 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

/** Format a decimal string from the API as Indian rupees (₹1,25,000). Never does arithmetic. */
export function rupees(v: string | null | undefined, whole = false): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return (whole && Number.isInteger(n) ? inr0 : inr).format(n);
}

export function signedRupees(v: string | null | undefined): string {
  if (v === null || v === undefined) return "—";
  const n = Number(v);
  return (n > 0 ? "+" : "") + rupees(v);
}

export function timeAgo(iso: string, lang: "en" | "ta" = "en"): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  const ta = lang === "ta";
  if (diff < 60) return ta ? "இப்போது" : "just now";
  if (diff < 3600) return ta ? `${Math.floor(diff / 60)} நிமிடம் முன்` : `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return ta ? `${Math.floor(diff / 3600)} மணி முன்` : `${Math.floor(diff / 3600)} h ago`;
  return ta ? `${Math.floor(diff / 86400)} நாள் முன்` : `${Math.floor(diff / 86400)} d ago`;
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

export const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());
