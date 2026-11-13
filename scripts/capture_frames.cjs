// Capture deck frames from the running web app (http://localhost:3000) with a headless Chromium browser.
// Usage: NODE_PATH=<dir containing puppeteer-core> node scripts/capture_frames.cjs [story|app|all]
// Env: BROWSER (default Brave), BASE_URL, DEMO_EMAIL/DEMO_PASSWORD (local seed account; see services/api/seed_demo.py).
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

const BASE = process.env.BASE_URL || "http://localhost:3000";
const BROWSER = process.env.BROWSER || "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser";
const OUT = path.join(__dirname, "..", "pitch", "assets");
const STORY_STEPS = 12;
const mode = process.argv[2] || "all";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// the Next.js dev "Issues" badge must not end up in deck frames
const hideDevBadge = (page) => page.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => {});

async function story(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  for (let i = 0; i < STORY_STEPS; i++) {
    await page.goto(`${BASE}/?shot=${i}&clean=1`, { waitUntil: "load", timeout: 120000 });
    await hideDevBadge(page);
    await sleep(9000); // models load, the truck drives in, post-processing settles
    const f = path.join(OUT, `story_${String(i).padStart(2, "0")}.jpg`);
    await page.screenshot({ path: f, type: "jpeg", quality: 88 });
    console.log("story", i, "->", path.basename(f));
  }
  await page.close();
}

async function app(browser) {
  const email = process.env.DEMO_EMAIL, password = process.env.DEMO_PASSWORD;
  if (!email || !password) throw new Error("set DEMO_EMAIL and DEMO_PASSWORD (local seed account)");
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/login`, { waitUntil: "load", timeout: 120000 });
  const status = await page.evaluate(async (e, p) => (await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: e, password: p }) })).status, email, password);
  if (status !== 200) throw new Error(`login failed: ${status}`);
  // Live numbers for the deck, straight from the API (never typed into slides by hand).
  const snap = await page.evaluate(async () => {
    const sess = await (await fetch("/api/session")).json();
    const sid = sess.stores[0].id;
    const get = async (p) => (await fetch(`/api${p}`, { headers: { "X-Store-Id": sid } })).json();
    return { store: sess.stores[0].name, captured_at: new Date().toISOString(), forecast: await get("/insights/forecast"), cashflow: await get("/insights/cashflow"),
      customers: await get("/insights/customers"), health: await get("/insights/health") };
  });
  delete snap.customers.at_risk; // the deck only needs counts, not per-payer rows
  fs.writeFileSync(path.join(OUT, "insights_snapshot.json"), JSON.stringify(snap, null, 2));
  console.log("insights snapshot saved");
  const pages = [["", "desk_app"], ["/insights", "desk_app_insights"], ["/sales", "desk_app_sales"], ["/shelf", "desk_app_shelf"],
    ["/demand", "desk_app_demand"], ["/opportunities", "desk_app_opportunities"], ["/trials", "desk_app_trials"], ["/preorders", "desk_app_preorders"]];
  for (const [p, name] of pages) {
    await page.goto(`${BASE}/app${p}`, { waitUntil: "load", timeout: 120000 });
    await hideDevBadge(page);
    await sleep(3500);
    await page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: "jpeg", quality: 88 });
    console.log("app", p || "/", "->", name);
  }
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  for (const [p, name] of [["", "mob_app_m"], ["/insights", "mob_app_insights_m"], ["/demand", "mob_app_demand_m"], ["/trials", "mob_app_trials_m"]]) {
    await page.goto(`${BASE}/app${p}`, { waitUntil: "load", timeout: 120000 });
    await hideDevBadge(page);
    await sleep(3500);
    await page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: "jpeg", quality: 85 });
    console.log("mobile", p || "/", "->", name);
  }
  await page.close();
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: BROWSER, headless: "new", args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--hide-scrollbars"] });
  try {
    if (mode === "story" || mode === "all") await story(browser);
    if (mode === "app" || mode === "all") await app(browser);
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
