// Captures the demo-video scenes from the real running app (localhost). Usage:
//   NODE_PATH=<dir with puppeteer-core> DEMO_EMAIL=.. DEMO_PASSWORD=.. node pitch/video/capture.cjs
const path = require("path");
const puppeteer = require("puppeteer-core");
const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT = path.join(__dirname, "frames");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
require("fs").mkdirSync(OUT, { recursive: true });

(async () => {
  const b = await puppeteer.launch({ executablePath: process.env.BROWSER || "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser", headless: "new",
    args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--hide-scrollbars", "--autoplay-policy=no-user-gesture-required", "--mute-audio"] });
  const p = await b.newPage();
  await p.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  const hide = () => p.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => {});
  const shot = async (id, opts = {}) => { await p.screenshot({ path: path.join(OUT, id + ".png"), ...opts }); console.log("frame", id); };
  const go = async (url, wait) => { await p.goto(BASE + url, { waitUntil: "load", timeout: 120000 }); await hide(); await sleep(wait); };
  const clickText = (text) => p.evaluate((t) => { const el = [...document.querySelectorAll("button,a,li,p,h3")].find((e) => e.textContent.trim().startsWith(t)); if (el) el.click(); return !!el; }, text);

  await go("/", 9000); await shot("01_hero");
  await go("/?shot=3&clean=1", 9000); await shot("02_illa");

  await go("/login", 1500);
  const store = await p.evaluate(async (e, pw) => {
    await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: e, password: pw }) });
    const s = await (await fetch("/api/session")).json();
    localStorage.setItem("mitra.store", s.stores[0].id);
    return s.stores[0].id;
  }, process.env.DEMO_EMAIL, process.env.DEMO_PASSWORD);

  await go("/app/soundbox", 3500); await shot("03_button");
  await clickText("Tamil");
  await p.waitForFunction(() => document.body.innerText.includes("SOUNDBOX SAID"), { timeout: 40000 }).catch(() => console.log("no reply seen"));
  await sleep(1200); await shot("04_heard");
  await shot("05_says", { clip: { x: 700, y: 330, width: 1200, height: 675 } });

  await go("/app/opportunities", 3000); await clickText("Mango"); await sleep(2500); await shot("06_opps");
  await go("/app/trials", 3500); await shot("07_trials");

  const payUrl = await p.evaluate(async (sid) => {
    const r = await fetch("/api/preorders", { method: "POST", headers: { "Content-Type": "application/json", "X-Store-Id": sid }, body: JSON.stringify({ item: "Rose Milk", quantity: 2, unit_price: "30", customer_name: "Priya", method: "paytm_link" }) });
    return (await r.json()).pay_url;
  }, store);
  console.log("pay url", payUrl);
  await go("/app/soundbox", 5000);
  const pay = await b.newPage();
  await pay.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await pay.goto(BASE + payUrl, { waitUntil: "load" }); await sleep(2500);
  await pay.screenshot({ path: path.join(OUT, "08_pay.png") }); console.log("frame 08_pay");
  await pay.evaluate(() => [...document.querySelectorAll("button")].find((x) => x.textContent.includes("Pay"))?.click());
  await sleep(1500); await pay.close();
  await p.bringToFront();
  await p.waitForFunction(() => document.body.innerText.includes("received"), { timeout: 30000 }).catch(() => console.log("no payment seen"));
  await sleep(900); await shot("09_paid");

  await go("/app/insights", 4500); await shot("10_insights");
  await go("/?shot=11&clean=1", 13000); await shot("11_close");
  await b.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
