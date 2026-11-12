"""MITRA MCP server (stdio): lets an AI assistant or agent read one store's missed-demand insights.

Read-only by design: it can list demand, opportunities and trial results and ask grounded questions, but it cannot
approve, spend, send or change anything. It authenticates as a normal store user through the MITRA API, so every
tenant check and audit rule still applies.

Run (e.g. from an MCP client config):
  MITRA_EMAIL=... MITRA_PASSWORD=... services/api/.venv/bin/python services/api/mitra_mcp.py
Env: MITRA_API (default http://127.0.0.1:8000), MITRA_STORE_ID (default: the user's first store).
"""

from __future__ import annotations

import os

import httpx
from mcp.server.mcpserver import MCPServer
from mcp.types import ToolAnnotations

API = os.environ.get("MITRA_API", "http://127.0.0.1:8000").rstrip("/")
READ_ONLY = ToolAnnotations(readOnlyHint=True, destructiveHint=False, openWorldHint=False)

server = MCPServer(
    name="mitra",
    title="MITRA: missed-demand intelligence",
    instructions="Read-only access to one kirana store's missed customer demand, stocking opportunities and trial results. "
    "Money figures come from MITRA's deterministic calculations; customer asks are not sales.",
    version="1.0.0",
)
_client: httpx.Client | None = None


def client() -> httpx.Client:
    global _client
    if _client is None:
        c = httpx.Client(base_url=API, timeout=60)
        r = c.post("/api/auth/login", json={"email": os.environ["MITRA_EMAIL"], "password": os.environ["MITRA_PASSWORD"]})
        r.raise_for_status()
        stores = r.json()["stores"]
        sid = os.environ.get("MITRA_STORE_ID") or (stores[0]["id"] if stores else None)
        if not sid:
            raise RuntimeError("This account has no store.")
        c.headers["X-Store-Id"] = sid
        _client = c
    return _client


def get(path: str):
    r = client().get(path)
    r.raise_for_status()
    return r.json()


@server.tool(
    description="Missed customer demand for the last N days, grouped by item (asks are not sales).", annotations=READ_ONLY
)
def missed_demand(days: int = 7) -> dict:
    rows = get(f"/api/demand?days={max(1, min(days, 90))}")
    totals: dict[str, int] = {}
    for r in rows:
        totals[r["normalized_item"]] = totals.get(r["normalized_item"], 0) + r["ask_count"]
    return {"days": days, "total_asks": sum(totals.values()), "by_item": dict(sorted(totals.items(), key=lambda x: -x[1]))}


@server.tool(
    description="Ranked stocking opportunities with evidence, proposed trial size and profit scenarios.", annotations=READ_ONLY
)
def opportunities() -> list[dict]:
    items = get("/api/opportunities?window=7")["items"]
    keep = ("display_name", "status", "score", "blockers", "margin_pct", "proposal", "scenarios")
    return [{k: o[k] for k in keep} | {"asks": o["evidence"]["ask_total"], "days": o["evidence"]["distinct_days"]} for o in items]


@server.tool(description="Stocking trials with status and, when completed, the realised result.", annotations=READ_ONLY)
def trial_results() -> list[dict]:
    return [{k: t[k] for k in ("product_name", "status", "proposed_qty", "planned_outlay", "result")} for t in get("/api/trials")]


@server.tool(
    description="Ask a question about the store in Tamil or English; answered only from the store's records.",
    annotations=ToolAnnotations(readOnlyHint=True, openWorldHint=False),
)
def ask_mitra(question: str) -> dict:
    r = client().post("/api/ask", json={"question": question[:500]})
    r.raise_for_status()
    return r.json()


if __name__ == "__main__":
    server.run("stdio")
