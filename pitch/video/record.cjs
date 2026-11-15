// Records real-motion clips of the running app for the demo film (puppeteer screencast -> webm).
//   NODE_PATH=<dir with puppeteer-core> DEMO_EMAIL=.. DEMO_PASSWORD=.. node pitch/video/record.cjs [only]
// The AI-button clip injects pitch/video/mic_raw.wav as the microphone stream, so the app's real listening code runs.
const path = require("path");
const puppeteer = require("puppeteer-core");
const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT = path.join(__dirname, "clips");
const only = process.argv[2];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const b = await puppeteer.launch({ executablePath: process.env.BROWSER || "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser", headless: "new",
    args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--hide-scrollbars", "--mute-audio", "--autoplay-policy=no-user-gesture-required",
      "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-audio-capture=${path.join(__dirname, "mic.wav")}`] });
  const p = await b.newPage();
  await p.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  const hide = (pg = p) => pg.addStyleTag({ content: "nextjs-portal{display:none!important} html{scroll-behavior:auto}" }).catch(() => {});
  const go = async (url, wait, pg = p) => { await pg.goto(BASE + url, { waitUntil: "load", timeout: 120000 }); await hide(pg); await sleep(wait); };
  const rec = async (name, fn, pg = p) => {
    if (only && only !== name) return;
    const r = await pg.screencast({ path: path.join(OUT, name + ".webm") });
    try { await fn(); } finally { await r.stop(); }
    console.log("clip", name);
  };
  const click = (pg, pred) => pg.evaluate((src) => { const el = [...document.querySelectorAll("button,a,input,li,label")].find(eval(src)); if (el) el.click(); return !!el; }, pred.toString());
  const glide = (pg, to, ms) => pg.evaluate(async (to, ms) => { const from = scrollY, t0 = performance.now(); await new Promise((done) => { const step = (t) => { const k = Math.min(1, (t - t0) / ms); scrollTo(0, from + (to - from) * (k * k * (3 - 2 * k))); k < 1 ? requestAnimationFrame(step) : done(); }; requestAnimationFrame(step); }); }, to, ms);

  // --- the 3D story: hero, the couple walks up, the ask, "illa"
  if (!only || only === "story") {
    await go("/", 500);
    await p.waitForFunction(() => { const l = [...document.querySelectorAll("div")].find((d) => d.textContent?.startsWith("MITRABuilding")); return l && getComputedStyle(l).opacity === "0"; }, { timeout: 90000 }).catch(() => {});
    await sleep(1500);
    await rec("story", async () => {
      await sleep(4500);
      for (const [n, hold] of [[1, 6500], [2, 6500], [3, 7500]]) {
        await p.evaluate((n) => document.querySelector(`[data-step="${n}"]`).scrollIntoView({ behavior: "smooth", block: "center" }), n);
        await sleep(hold);
      }
    });
  }

  await go("/login", 1200);
  const store = await p.evaluate(async (e, pw) => {
    await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: e, password: pw }) });
    const s = await (await fetch("/api/session")).json();
    localStorage.setItem("mitra.store", s.stores[0].id);
    return s.stores[0].id;
  }, process.env.DEMO_EMAIL, process.env.DEMO_PASSWORD);

  // --- the AI button, with a real conversation arriving through the microphone
  if (!only || only === "soundbox") {
    // Headless Chromium's fake-microphone file arrives as silence, so the conversation is injected as the
    // microphone stream instead. The app's own listener (silence detection, segmenting, upload) runs unchanged.
    const wav = require("fs").readFileSync(path.join(__dirname, "mic_raw.wav")).toString("base64");
    await p.evaluateOnNewDocument((b64) => {
      navigator.mediaDevices.getUserMedia = async () => {
        const ctx = new AudioContext();
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const buf = await ctx.decodeAudioData(bytes.buffer);
        const dest = ctx.createMediaStreamDestination();
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(dest);
        src.start(ctx.currentTime + 2.5); // the customer speaks 2.5 s after the button is pressed
        return dest.stream;
      };
    }, wav);
    await go("/app/soundbox", 3000);
    await rec("soundbox", async () => {
      await sleep(2500);
      await p.click('[aria-label="Turn AI button on"]');
      await sleep(1800);
      await p.click('[role=dialog] input[type=checkbox]');
      await sleep(1200);
      await p.evaluate(() => [...document.querySelectorAll("[role=dialog] button")].find((x) => x.textContent.trim() === "Turn on").click());
      const ok = await p.waitForFunction(() => document.body.innerText.includes("SOUNDBOX SAID"), { timeout: 45000 }).then(() => true).catch(() => false);
      console.log("listening path replied:", ok);
      await sleep(8000);
    });
    await p.click('[aria-label="Turn AI button off"]').catch(() => {});
    await sleep(800);
  }

  if (!only || only === "opps") {
    await go("/app/opportunities", 2500);
    await rec("opps", async () => { await sleep(1500); await click(p, (e) => e.textContent.includes("Mango")); await sleep(3500); await glide(p, 420, 2500); await sleep(6000); });
  }
  if (!only || only === "trials") {
    await go("/app/trials", 2500);
    await rec("trials", async () => { await sleep(2500); await glide(p, 380, 3000); await sleep(4500); });
  }

  const preorder = () => p.evaluate(async (sid) => {
    const r = await fetch("/api/preorders", { method: "POST", headers: { "Content-Type": "application/json", "X-Store-Id": sid }, body: JSON.stringify({ item: "Rose Milk", quantity: 2, unit_price: "30", customer_name: "Priya", method: "paytm_link" }) });
    return (await r.json()).pay_url;
  }, store);
  if (!only || only === "pay") {
    const url = await preorder();
    const pay = await b.newPage();
    await pay.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
    await pay.goto(BASE + url, { waitUntil: "load" }); await hide(pay); await sleep(1500);
    await rec("pay", async () => { await sleep(3000); await click(pay, (e) => e.textContent.includes("Pay")); await sleep(5000); }, pay);
    await pay.close();
    await sleep(6000); // let that payment's announcement pass before the next clip
  }
  if (!only || only === "paid") {
    const url = await preorder();
    await go("/app/soundbox", 5500);
    await rec("paid", async () => {
      await sleep(1500);
      await p.evaluate((u) => fetch("/api" + u, { method: "POST" }), url);
      await p.waitForFunction(() => document.body.innerText.includes("received"), { timeout: 30000 }).catch(() => console.log("no payment seen"));
      await sleep(9000);
    });
  }
  if (!only || only === "insights") {
    await go("/app/insights", 3500);
    await rec("insights", async () => { await sleep(2500); await glide(p, 520, 4000); await sleep(2500); await glide(p, 1050, 4000); await sleep(3000); });
  }
  await b.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
