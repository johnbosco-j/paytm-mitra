// Typed client for the MITRA FastAPI service (proxied same-origin at /api).

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: { field: string; message: string }[],
  ) {
    super(message);
  }
}

const STORE_KEY = "mitra.store";

export function getStoreId(): string | null {
  try {
    return localStorage.getItem(STORE_KEY);
  } catch {
    return null;
  }
}

export function setStoreId(id: string | null) {
  try {
    if (id) localStorage.setItem(STORE_KEY, id);
    else localStorage.removeItem(STORE_KEY);
  } catch {
    /* storage unavailable: store selection falls back to the first store */
  }
}

type Opts = { method?: string; body?: unknown; form?: FormData; idempotencyKey?: string; signal?: AbortSignal };

export async function api<T = unknown>(path: string, opts: Opts = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const sid = getStoreId();
  if (sid) headers["X-Store-Id"] = sid;
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: opts.method ?? (body ? "POST" : "GET"),
      headers,
      body,
      credentials: "same-origin",
      signal: opts.signal,
    });
  } catch {
    throw new ApiError(0, "NETWORK", "Can't reach MITRA. Check your internet connection and try again.");
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const d = (data ?? {}) as { code?: string; message?: string; details?: { field: string; message: string }[] };
    const fallback = res.status >= 500 ? "MITRA's server had a problem. Please try again." : "Request failed.";
    throw new ApiError(res.status, d.code ?? "ERROR", d.message ?? fallback, d.details);
  }
  return data as T;
}

export const newKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

// ---------- shared types (mirror services/api serializers)

export type Role = "owner" | "staff";
export type StoreRef = { id: string; name: string; city: string; role: Role; language: string };
export type Me = { user: { id: string; name: string; email: string; locale: string }; stores: StoreRef[] };

export type Product = {
  id: string;
  name: string;
  aliases: string[];
  category: string;
  unit: string;
  cost_price: string | null;
  sell_price: string | null;
  stock_qty: number;
  shelf_life_days: number | null;
  supplier_name: string | null;
  source_type: string;
};

export type Reason = "not_stocked" | "out_of_stock" | "variant_missing" | "too_expensive" | "unknown";

export type DemandRequest = {
  id: string;
  raw_item: string;
  normalized_item: string;
  ask_count: number;
  reason: Reason;
  notes: string;
  transcript: string | null;
  language: string | null;
  product_id: string | null;
  source_type: string;
  extractor: string | null;
  status: string;
  requested_at: string;
};

export type DraftRequest = {
  raw_item: string;
  normalized_item: string;
  ask_count: number | null;
  ask_count_explicit: boolean;
  reason: Reason;
  uncertainties: string[];
  requires_review: boolean;
  product_id: string | null;
  product_name: string | null;
  in_stock_qty: number | null;
};

export type Extraction = {
  transcript: string;
  language: string;
  english_gloss: string;
  requests: DraftRequest[];
  extractor: string;
  warning: string | null;
  source: "voice" | "text";
};

export type Scenario = {
  label: string;
  units_sold: number;
  revenue: string;
  cogs: string;
  gross_profit: string;
  purchase_outlay: string;
  cash_difference: string;
  leftover_units: number;
  leftover_value: string;
  profit_if_leftover_spoils: string;
};

export type Opportunity = {
  item: string;
  display_name: string;
  score: number;
  score_version: string;
  components: Record<string, number>;
  weights: Record<string, number>;
  status: "ready" | "needs_cost" | "insufficient_evidence" | "unprofitable";
  blockers: string[];
  evidence: {
    ask_total: number;
    records: number;
    distinct_days: number;
    last_ask_at: string;
    window_days: number;
    reasons: string[];
    sample_share: number;
    request_ids: string[];
  };
  product: {
    id: string;
    name: string;
    cost_price: string | null;
    sell_price: string | null;
    stock_qty: number;
    shelf_life_days: number | null;
    unit: string;
    supplier_name: string | null;
  } | null;
  margin_pct: string | null;
  proposal: { quantity: number; reasons: string[]; math_version: string };
  scenarios: Scenario[];
  open_trial_id: string | null;
};

export type TrialResult = {
  received_qty: number;
  sold_qty: number;
  wasted_qty: number;
  leftover_qty: number;
  purchase_outlay: string;
  revenue: string;
  cogs: string;
  gross_profit: string;
  waste_writeoff: string;
  gross_profit_after_waste: string;
  cash_difference: string;
  leftover_value: string;
  sell_through_pct: string;
};

export type Trial = {
  id: string;
  item: string;
  product_id: string;
  product_name: string;
  unit: string;
  status: "pending_approval" | "approved" | "active" | "completed" | "rejected" | "cancelled";
  proposed_qty: number;
  unit_cost: string;
  unit_price: string;
  planned_outlay: string;
  snapshot: {
    score?: number;
    recommended_qty?: number;
    reasons?: string[];
    scenarios?: Scenario[];
    evidence?: Opportunity["evidence"];
    owner_edited_qty_from?: number;
  };
  proposed_by: string | null;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string;
  received_qty: number | null;
  actual_unit_cost: string | null;
  sold_qty: number | null;
  wasted_qty: number | null;
  actual_unit_price: string | null;
  completed_at: string | null;
  created_at: string;
  result: TrialResult | null;
};

export type Dashboard = {
  store: { id: string; name: string; city: string; role: Role; trial_budget: string | null };
  kpis: {
    asks_7d: number;
    items_7d: number;
    ready_opportunities: number;
    open_trials: number;
    completed_trials: number;
    realized_gross_profit: string;
  };
  series: { date: string; asks: number }[];
  top_items: [string, number][];
  attention: {
    kind: "approval" | "receive" | "outcome" | "opportunity" | "needs_cost";
    trial_id?: string;
    item: string;
    display_name?: string;
    qty?: number;
    score?: number;
    asks?: number;
  }[];
  sample_data_present: boolean;
  ai_available: boolean;
};

export type AuditEvent = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string;
  actor: string | null;
  created_at: string;
};
