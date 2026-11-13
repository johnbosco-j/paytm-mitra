// Paytm MITRA — animated pitch deck (v2). Run: NODE_PATH=<node_modules> node pitch/build_deck.js pitch/Paytm_MITRA_Pitch.pptx
// Shapes named "A:<effect>:<order>" get entrance animations from pitch/animate.py; "!!bg" backgrounds morph between slides.
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const lu = require("react-icons/lu");

const OUT = process.argv[2] || "pitch/Paytm_MITRA_Pitch.pptx";
const A = (f) => path.join(__dirname, "assets", f);
const C = { navy: "002E6E", ink: "020B1F", blue: "00BAF2", teal: "21C8A2", amber: "F5B75C", coral: "EF6E71", white: "FFFFFF", mist: "BFD3EA", card: "0B1D3D", line: "23406B" };
const snap = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, "assets", "insights_snapshot.json"), "utf8")); } catch { return null; }
})();
const metrics = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, "../services/ml/reports/summary.json"), "utf8")); } catch { return null; }
})();

async function icon(name, color = C.blue, size = 256) {
  const Cmp = lu[name] || lu.LuCircle;
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Cmp, { size, color: "#" + color, strokeWidth: 2 }));
  return "image/png;base64," + (await sharp(Buffer.from(svg)).png().toBuffer()).toString("base64");
}

(async () => {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.title = "Paytm MITRA — Missed-demand Intelligence for Trade, Restock and Action";
  pres.author = "Johnbosco J, Jeffrey Figo J, Joe Naren A";
  pres.theme = { headFontFace: "Arial", bodyFontFace: "Calibri" };
  pres.defineSlideMaster({
    title: "DARK",
    background: { color: C.ink },
    objects: [{ text: { text: "Paytm MITRA · Made by RivenDevs · Build for India AI · Chennai 2026 · Prototype, not an official Paytm product", options: { x: 0.5, y: 5.28, w: 8.3, h: 0.22, fontSize: 8, color: "6F86A8", margin: 0 } } }],
    slideNumber: { x: 9.1, y: 5.28, w: 0.4, h: 0.22, fontSize: 8, color: "6F86A8", align: "right" },
  });
  const N = { n: 0 };
  const nm = (fx, order) => `A:${fx}:${order}`;
  const bg = (s, file, overlay = "ov_left.png") => {
    s.addImage({ path: A(file), x: 0, y: 0, w: 10, h: 5.625, objectName: "!!bg", altText: "Scene from the MITRA 3D story" });
    if (overlay) s.addImage({ path: A(overlay), x: 0, y: 0, w: 10, h: 5.625, objectName: "!!overlay", altText: "" });
  };
  const kicker = (s, t, o = 0, y = 0.42) =>
    s.addText(t, { x: 0.55, y, w: 8.5, h: 0.26, fontSize: 11, bold: true, color: C.blue, charSpacing: 3, margin: 0, isTextBox: true, objectName: nm("rise", o) });
  const title = (s, t, o = 1, y = 0.7, w = 8.9, size = 28) =>
    s.addText(t, { x: 0.55, y, w, h: 0.95, fontSize: size, bold: true, fontFace: "Arial", color: C.white, margin: 0, valign: "top", isTextBox: true, objectName: nm("rise", o) });
  const card = (s, x, y, w, h, o, fill = C.card, line = C.line, fx = "rise") =>
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.14, fill: { color: fill, transparency: 8 }, line: { color: line, width: 0.75 }, objectName: nm(fx, o),
      shadow: { type: "outer", color: "000000", opacity: 0.35, blur: 12, offset: 3, angle: 90 } });
  const txt = (s, t, o, opt) => s.addText(t, { margin: 0, isTextBox: true, objectName: nm(opt.fx || "rise", o), ...opt });
  const iconDot = async (s, x, y, ic, color, o, d = 0.5) => {
    s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: "10294F" }, line: { color: color, width: 1 }, objectName: nm("zoom", o) });
    s.addImage({ data: await icon(ic, color), x: x + d * 0.24, y: y + d * 0.24, w: d * 0.52, h: d * 0.52, objectName: nm("zoom", o), altText: ic.replace("Lu", "") });
  };

  // 1 ── TITLE ───────────────────────────────────────────────────────────────
  {
    const s = pres.addSlide({ masterName: "DARK" });
    bg(s, "story_00.jpg");
    txt(s, "PAYTM BUILD FOR INDIA AI  ·  TRACK 1 · MERCHANT GROWTH AI", 0, { x: 0.55, y: 0.6, w: 8.6, h: 0.26, fontSize: 11, bold: true, color: C.blue, charSpacing: 3 });
    txt(s, "Paytm MITRA", 1, { x: 0.55, y: 1.05, w: 6, h: 1.0, fontSize: 54, bold: true, fontFace: "Arial", color: C.white, fx: "zoom" });
    txt(s, "Missed-demand Intelligence for Trade, Restock & Action", 2, { x: 0.55, y: 2.08, w: 5.4, h: 0.4, fontSize: 17, color: C.mist });
    txt(s, [{ text: "Every QR knows what sold. ", options: { color: C.white } }, { text: "MITRA hears what didn't.", options: { color: C.blue } }], 3,
      { x: 0.55, y: 2.62, w: 6.2, h: 0.5, fontSize: 21, bold: true, italic: true });
    txt(s, [{ text: "Johnbosco J  ·  Jeffrey Figo J  ·  Joe Naren A", options: { bold: true, color: C.white, breakLine: true } }, { text: "Chennai  ·  15 November 2026", options: { color: C.mist } }], 4,
      { x: 0.55, y: 4.25, w: 5.5, h: 0.6, fontSize: 13 });
    s.addNotes("Every QR in India knows what sold. None of them knows what didn't. This is Naren Stores in Velachery: our 3D story, built in the app itself.");
  }

  // 2 ── PROBLEM: the sale that never existed ───────────────────────────────
  {
    const s = pres.addSlide({ masterName: "DARK" });
    bg(s, "story_03.jpg");
    kicker(s, "01 · PROBLEM STATEMENT");
    title(s, "“Anna, mango lassi irukka?”  “Illa.”");
    txt(s, "She walks away. No payment happens, so no system records it. The sale didn't fail; it never existed.", 2, { x: 0.55, y: 1.55, w: 5.2, h: 0.7, fontSize: 15, color: C.mist });
    const stats = [["25.47B", "UPI transactions in Oct 2026 (NPCI)", C.blue], ["1.64 Cr", "Paytm subscription merchants (Q2 FY27)", C.blue], ["0", "records when a customer asks and leaves", C.coral]];
    stats.forEach(([n, l, col], i) => {
      const x = 0.55 + i * 2.05;
      card(s, x, 2.55, 1.9, 1.5, 3 + i);
      txt(s, n, 3 + i, { x: x + 0.18, y: 2.68, w: 1.6, h: 0.65, fontSize: 30, bold: true, fontFace: "Arial", color: col });
      txt(s, l, 3 + i, { x: x + 0.18, y: 3.35, w: 1.6, h: 0.6, fontSize: 11, color: C.mist });
    });
    txt(s, "Market context only, not MITRA traction. Sources: NPCI UPI statistics, Paytm Q2 FY27 results.", 6, { x: 0.55, y: 4.85, w: 6, h: 0.22, fontSize: 8, color: "7D93B5", fx: "fade" });
    s.addNotes("Payments are digitised at massive scale. But a missed request leaves zero trace.");
  }

  // 3 ── PROBLEM: the blind spot ─────────────────────────────────────────────
  {
    const s = pres.addSlide({ masterName: "DARK" });
    bg(s, "story_05.jpg");
    kicker(s, "01 · PROBLEM STATEMENT · THE BLIND SPOT");
    title(s, "Payment dashboards are blind to lost demand");
    ["Customer asks", "“Not available”", "No payment", "No signal"].forEach((t, i) => {
      const x = 0.55 + i * 1.6;
      s.addShape(pres.shapes.CHEVRON, { x, y: 1.75, w: 1.55, h: 0.48, fill: { color: i === 3 ? C.coral : "143463" }, line: { color: C.line, width: 0.5 }, objectName: nm("left", 2 + i) });
      txt(s, t, 2 + i, { x: x + 0.2, y: 1.75, w: 1.15, h: 0.48, fontSize: 11.5, bold: true, color: C.white, align: "center", valign: "middle", fx: "left" });
    });
    const pains = [["LuBrain", "The owner guesses what to stock, from memory"], ["LuWallet", "Cash gets tied up in the wrong stock; perishables spoil"], ["LuEyeOff", "AI copilots built on payments only see what already sold"]];
    for (let i = 0; i < pains.length; i++) {
      const y = 2.6 + i * 0.68;
      await iconDot(s, 0.55, y, pains[i][0], i === 2 ? C.coral : C.amber, 6 + i, 0.46);
      txt(s, pains[i][1], 6 + i, { x: 1.15, y: y + 0.05, w: 5.2, h: 0.4, fontSize: 15, color: C.white, valign: "middle" });
    }
    s.addNotes("The QR sees only what sold. 24 asks in a week for one item can vanish completely.");
  }

  // 4 ── SOLUTION: LEAP loop ────────────────────────────────────────────────
  {
    const s = pres.addSlide({ masterName: "DARK" });
    bg(s, "story_06.jpg", "ov_full.png");
    kicker(s, "02 · PROPOSED SOLUTION");
    title(s, "MITRA: the LEAP loop for every kirana");
    const steps = [
      ["LuMic", "Listen", "Tap and speak any of India's 22 languages or a code-mix. AI turns it into a record the owner confirms.", C.blue],
      ["LuCalculator", "Evaluate", "Confirmed asks + real cost and price → a cautious, explained trial. No cost, no profit claim.", C.blue],
      ["LuShieldCheck", "Approve", "Owner-only spending. Tamil supplier draft. Paytm pre-order links. Never auto-sends.", C.amber],
      ["LuChartLine", "Prove", "Revenue, gross profit, cash vs outlay, leftover: predicted vs actual, every time.", C.teal],
    ];
    for (let i = 0; i < steps.length; i++) {
      const [ic, k, d, col] = steps[i];
      const x = 0.55 + i * 2.25;
      card(s, x, 1.75, 2.08, 2.75, 2 + i * 2, C.card, col, "zoom");
      await iconDot(s, x + 0.2, 1.95, ic, col, 3 + i * 2);
      txt(s, k, 3 + i * 2, { x: x + 0.2, y: 2.55, w: 1.7, h: 0.4, fontSize: 19, bold: true, color: C.white });
      txt(s, d, 3 + i * 2, { x: x + 0.2, y: 2.98, w: 1.72, h: 1.4, fontSize: 11.5, color: C.mist, valign: "top" });
    }
    txt(s, [{ text: "AI understands the language.  ", options: { color: C.blue } }, { text: "Code does the money.  ", options: { color: C.teal } }, { text: "The owner decides.", options: { color: C.white } }], 11,
      { x: 0.55, y: 4.7, w: 9, h: 0.35, fontSize: 15, bold: true, fx: "fade" });
    s.addNotes("LEAP: Listen, Evaluate, Approve, Prove. The LLM never computes money and never acts alone.");
  }

  // 5 ── SOLUTION IN ACTION: app ─────────────────────────────────────────────
  {
    const s = pres.addSlide({ masterName: "DARK" });
    s.background = { color: "041533" };
    kicker(s, "02 · PROPOSED SOLUTION · BUILT AND WORKING");
    title(s, "A real Paytm-style merchant app, not a mockup", 1, 0.7, 8.8, 28);
    // desktop screenshot in a browser frame
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.55, y: 1.5, w: 6.1, h: 3.62, rectRadius: 0.1, fill: { color: "E9EEF5" }, line: { color: "35517F", width: 0.75 }, objectName: nm("rise", 2) });
    s.addImage({ path: A("desk_app.jpg"), x: 0.62, y: 1.62, w: 5.96, h: 3.43, objectName: nm("rise", 2), altText: "MITRA home dashboard" });
    // phone
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 6.95, y: 1.15, w: 2.05, h: 4.05, rectRadius: 0.28, fill: { color: "0B1220" }, line: { color: "3A4A66", width: 1 }, objectName: nm("zoom", 4) });
    s.addImage({ path: A("mob_app_demand_m.jpg"), x: 7.05, y: 1.27, w: 1.85, h: 3.81, objectName: nm("zoom", 4), altText: "MITRA voice capture on phone",
      sizing: { type: "cover", w: 1.85, h: 3.81 } });
    txt(s, "Speak → review → save", 5, { x: 6.95, y: 5.25 - 0.05, w: 2.05, h: 0.2, fontSize: 9, color: C.mist, align: "center", fx: "fade" });
    s.addNotes("Everything you see is live: Next.js app, FastAPI backend, real database. Mobile has the Paytm-style raised Speak button.");
  }

  // 6 ── SOLUTION IN ACTION: maths & proof ──────────────────────────────────
  {
    const s = pres.addSlide({ masterName: "DARK" });
    bg(s, "story_07.jpg", "ov_full.png");
    kicker(s, "02 · PROPOSED SOLUTION · EVALUATE → PROVE");
    title(s, "24 asks ≠ 24 sales. Try 16. Prove it.");
    const rows = [["Confirmed asks (7 days)", "24"], ["Cost / price", "₹22 / ₹35"], ["Suggested trial", "16 bottles"], ["Money in now", "₹352"]];
    rows.forEach(([k, v], i) => {
      txt(s, k, 2 + i, { x: 0.55, y: 1.65 + i * 0.42, w: 2.4, h: 0.36, fontSize: 13, color: C.mist, valign: "middle" });
      txt(s, v, 2 + i, { x: 2.95, y: 1.65 + i * 0.42, w: 1.6, h: 0.36, fontSize: 15, bold: true, color: C.white, valign: "middle" });
    });
    card(s, 0.55, 3.45, 4.2, 1.55, 6, "0A2A22", C.teal);
    txt(s, [{ text: "14 of 16 sold → gross profit ₹182", options: { bold: true, color: C.teal, fontSize: 17, breakLine: true } },
      { text: "Revenue ₹490 · COGS ₹308 · cash vs outlay ₹138 (not profit) · leftover ₹44", options: { color: C.mist, fontSize: 11.5 } }], 7,
      { x: 0.75, y: 3.58, w: 3.85, h: 1.3, valign: "top" });
    s.addChart(pres.charts.BAR, [{ name: "Gross profit", labels: ["8 sold", "12 sold", "16 sold", "14 ACTUAL"], values: [104, 156, 208, 182] }], {
      x: 5.1, y: 1.55, w: 4.4, h: 3.4, barDir: "col", showTitle: true, title: "Predicted vs actual gross profit (₹)", titleColor: C.white, titleFontSize: 12, titleFontFace: "+mn-lt",
      chartColors: ["35517F", "35517F", "35517F", C.teal], showValue: true, dataLabelPosition: "outEnd", dataLabelColor: C.white, dataLabelFontSize: 11, dataLabelFormatCode: "₹#,##0", dataLabelFontFace: "+mn-lt",
      catAxisLabelColor: C.mist, catAxisLabelFontFace: "+mn-lt", catAxisLabelFontSize: 10, valAxisHidden: true, valGridLine: { style: "none" }, catGridLine: { style: "none" }, showLegend: false, barGapWidthPct: 55,
      objectName: nm("wipe", 8),
    });
    txt(s, "Demo inputs are labeled SAMPLE data; one trial is an observation, not measured merchant ROI.", 9, { x: 5.1, y: 4.95, w: 4.4, h: 0.2, fontSize: 8, color: "7D93B5", fx: "fade" });
    s.addNotes("Money maths is deterministic Decimal code with golden tests. ₹182 gross profit is shown separately from ₹138 cash difference.");
  }

  // 6b ── BEYOND ONE TRIAL: the shop's growth OS (numbers from the live API snapshot) ─────────────
  {
    const s = pres.addSlide({ masterName: "DARK" });
    s.background = { color: "041533" };
    kicker(s, "02 · PROPOSED SOLUTION · GROWTH OS");
    title(s, "What sold + what didn't = a shop that plans ahead", 1, 0.7, 9, 25);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.55, y: 1.45, w: 5.0, h: 3.2, rectRadius: 0.1, fill: { color: "E9EEF5" }, line: { color: "35517F", width: 0.75 }, objectName: nm("rise", 2) });
    s.addImage({ path: A("desk_app_insights.jpg"), x: 0.61, y: 1.51, w: 4.88, h: 3.08, objectName: nm("rise", 2), altText: "MITRA insights: health, forecast, cash runway", sizing: { type: "cover", w: 4.88, h: 3.08 } });
    const f = snap?.forecast, c = snap?.cashflow, cu = snap?.customers, h = snap?.health;
    const when = c?.earliest_risk_date ? new Date(c.earliest_risk_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : null;
    const tiles = [
      ["LuTrendingUp", "7-day sales forecast", f?.backtest ? `${f.backtest.mape_model}% error vs ${f.backtest.mape_naive}% naive` : "Weekday profile, backtested", C.blue],
      ["LuWallet", "Cash runway, 2,000 simulations", c?.status === "ok" ? `${Math.round(c.probability_shortfall * 100)}% chance of a shortfall${when ? `, around ${when}` : ""}` : "Monte Carlo on sales, margin and dues", C.amber],
      ["LuUsers", "Regulars drifting away", cu?.counts ? `${cu.counts.regular} regulars · ${cu.counts.at_risk} at risk · ${cu.counts.lost} lost` : "From hashed UPI payers in Paytm statements", C.coral],
      ["LuScanLine", "Shelf scanner + statement import", "Photo → empty-slot drafts · Paytm CSV → deduped sales", C.teal],
    ];
    for (let i = 0; i < tiles.length; i++) {
      const [ic, k, v, col] = tiles[i];
      const y = 1.45 + i * 0.82;
      card(s, 5.8, y, 3.65, 0.72, 3 + i, C.card, col);
      await iconDot(s, 5.92, y + 0.13, ic, col, 3 + i, 0.46);
      txt(s, k, 3 + i, { x: 6.5, y: y + 0.07, w: 2.9, h: 0.28, fontSize: 12, bold: true, color: C.white });
      txt(s, v, 3 + i, { x: 6.5, y: y + 0.35, w: 2.9, h: 0.3, fontSize: 10, color: col });
    }
    txt(s, h ? `Business health ${h.score}/100 (${h.band}): habits score for the owner, never a credit score.` : "Business health: a habits score for the owner, never a credit score.", 7,
      { x: 0.55, y: 4.75, w: 9, h: 0.25, fontSize: 11, bold: true, color: C.teal, fx: "fade" });
    txt(s, `Computed live by MITRA's tested code on ${snap?.store ?? "the demo store"}'s SAMPLE sales; not merchant traction.`, 8, { x: 0.55, y: 5.0, w: 9, h: 0.2, fontSize: 8, color: "7D93B5", fx: "fade" });
    s.addNotes("Sales plus missed demand lets MITRA forecast the week, simulate cash 2,000 times and flag regulars who stopped coming. Every number is computed by code and shows its method.");
  }

  // 7 ── TECH STACK: architecture ───────────────────────────────────────────
  {
    const s = pres.addSlide({ masterName: "DARK" });
    s.background = { color: "041533" };
    kicker(s, "03 · TECHNOLOGY / TECH STACK");
    title(s, "Built like a product, ready for Paytm");
    const box = (x, y, w, h, head, lines, col, o, ic) => {
      card(s, x, y, w, h, o, "0B1D3D", col, "zoom");
      txt(s, head, o, { x: x + 0.15, y: y + 0.1, w: w - 0.3, h: 0.3, fontSize: 13, bold: true, color: col, fx: "zoom" });
      txt(s, lines.map((l, j) => ({ text: l, options: { bullet: { indent: 10 }, breakLine: j < lines.length - 1 } })), o, { x: x + 0.15, y: y + 0.42, w: w - 0.3, h: h - 0.5, fontSize: 10.5, color: C.mist, valign: "top", paraSpaceAfter: 2, fx: "zoom" });
    };
    box(0.55, 1.6, 2.7, 1.55, "Merchant app", ["Next.js 16 · React 19 · Tailwind 4", "Paytm-style UI · Tamil / English", "3D story: R3F + GSAP + Lenis + voice", "Blender pipeline: store, people, truck"], C.blue, 2);
    box(3.65, 1.6, 2.7, 1.55, "API & data", ["FastAPI · Pydantic v2 · SQLAlchemy 2", "Alembic migrations · PostgreSQL 17 verified", "Decimal economics engine", "Trial + pre-order state machines"], C.blue, 3);
    box(6.75, 1.6, 2.7, 1.55, "AI layer", ["Gemini: speech in 22 Indian languages, vision", "MITRA-Lite + Whisper turbo: fully offline", "Rule fallback · hallucination guards", "Grounded answers only"], C.teal, 4);
    box(0.55, 3.4, 4.25, 1.4, "Paytm & payments", ["Paytm Payment Links (staging, official checksum lib)", "UPI QR pre-orders · feature-flagged connectors", "Soundbox voice channel: roadmap with Paytm"], C.amber, 5);
    box(5.2, 3.4, 4.25, 1.4, "Security", ["httpOnly JWT, bcrypt, lockout, rate limits", "Origin guard, security headers, session revoke", "Encrypted customer phones · owner-only reveal · audit log"], C.coral, 6);
    txt(s, "38 backend tests on SQLite + PostgreSQL · strict TypeScript · lint clean · MCP server for AI agents", 7, { x: 0.55, y: 4.95, w: 9, h: 0.22, fontSize: 10, bold: true, color: C.teal, fx: "fade" });
    s.addNotes("Modular monolith on purpose. Every rupee is computed by tested code; the model only reads language.");
  }

  // 8 ── OUR OWN MODEL: MITRA-Lite ───────────────────────────────────────────
  {
    const s = pres.addSlide({ masterName: "DARK" });
    s.background = { color: "041533" };
    kicker(s, "03 · TECHNOLOGY · OUR OWN MODEL");
    title(s, "MITRA-Lite: our own offline Tamil model");
    const facts = [["14,000", "Tamil / Tanglish / English training notes"], ["1.5B", "Qwen2.5 base, LoRA fine-tuned on Apple MLX"], ["0 KB", "data sent to the cloud in offline mode"]];
    facts.forEach(([n, l], i) => {
      card(s, 0.55, 1.6 + i * 1.08, 3.6, 0.95, 2 + i);
      txt(s, n, 2 + i, { x: 0.75, y: 1.68 + i * 1.08, w: 1.4, h: 0.75, fontSize: 24, bold: true, color: C.blue, valign: "middle", fontFace: "Arial" });
      txt(s, l, 2 + i, { x: 2.1, y: 1.68 + i * 1.08, w: 1.95, h: 0.75, fontSize: 11, color: C.mist, valign: "middle" });
    });
    const base = metrics?.baseline?.item_f1 ?? 0.268;
    const tuned = metrics?.tuned?.item_f1 ?? null;
    if (tuned != null) {
      const pct = (v) => Math.round(v * 100);
      const neg = (x) => { const [a, b] = String(x).split("/").map(Number); return b ? Math.round((a / b) * 100) : 0; };
      const labels = ["Ask count exact", "Reason correct", "Ignores injections", "Item name (strict)"];
      s.addChart(pres.charts.BAR, [
        { name: "Base Qwen2.5-1.5B", labels, values: [pct(metrics.baseline.count_exact), pct(metrics.baseline.reason_acc), neg(metrics.baseline.negatives_correct), pct(base)] },
        { name: "MITRA-Lite (ours)", labels, values: [pct(metrics.tuned.count_exact), pct(metrics.tuned.reason_acc), neg(metrics.tuned.negatives_correct), pct(tuned)] },
      ], {
        x: 4.4, y: 1.5, w: 5.1, h: 3.2, barDir: "col", barGrouping: "clustered", showTitle: true, title: "40 hand-written shop notes it never saw (%)", titleColor: C.white, titleFontSize: 12, titleFontFace: "+mn-lt",
        chartColors: ["35517F", C.teal], showValue: true, dataLabelPosition: "outEnd", dataLabelColor: C.white, dataLabelFontSize: 10, dataLabelFontFace: "+mn-lt",
        catAxisLabelColor: C.mist, catAxisLabelFontSize: 9, catAxisLabelFontFace: "+mn-lt", valAxisHidden: true, valAxisMaxVal: 110, valAxisMinVal: 0, valGridLine: { style: "none" }, catGridLine: { style: "none" },
        showLegend: true, legendPos: "b", legendColor: C.mist, legendFontSize: 10, legendFontFace: "+mn-lt", barGapWidthPct: 60,
        objectName: nm("wipe", 5),
      });
      txt(s, "Strict exact-name scoring; trained on synthetic notes. Code then strips any size the model invents.", 6, { x: 4.4, y: 4.75, w: 5.1, h: 0.3, fontSize: 9, color: "7D93B5", fx: "fade" });
    } else {
      card(s, 4.5, 1.6, 5, 3, 5);
      txt(s, [{ text: `Base model item F1: ${Math.round(base * 100)}%`, options: { bold: true, color: C.white, fontSize: 18, breakLine: true } },
        { text: "It even read “rose milk” written in Tamil script as “pair of socks”. Fine-tuning results are measured on the same 40 hand-written notes.", options: { color: C.mist, fontSize: 12 } }], 6,
        { x: 4.75, y: 1.8, w: 4.5, h: 2.5, valign: "top" });
    }
    s.addNotes("We fine-tuned our own model so MITRA works with no internet, and measured it honestly on hand-written notes it never saw.");
  }

  // 9 ── USP ──────────────────────────────────────────────────────────────────
  {
    const s = pres.addSlide({ masterName: "DARK" });
    bg(s, "story_08.jpg", "ov_full.png");
    kicker(s, "04 · USP");
    title(s, "It sees what payment data can't");
    const rows = [["", "Payment-data copilots", "Paytm MITRA"], ["Signal", "Completed sales", "Unmet demand + your cost & price"], ["Output", "Insights, answers", "A sized, reversible trial + pre-orders"],
      ["Money maths", "Generated text", "Deterministic, tested code"], ["Action", "Suggestions", "Owner-only approval, audit, never auto-sends"], ["Offline", "Cloud only", "MITRA-Lite runs on the shop's device"]];
    rows.forEach((r, i) => {
      const y = 1.6 + i * 0.47;
      if (i) s.addShape(pres.shapes.RECTANGLE, { x: 0.55, y, w: 8.9, h: 0.44, fill: { color: i % 2 ? "0B1D3D" : "0E2447", transparency: 10 }, line: { color: C.line, width: 0.25 }, objectName: nm("left", 1 + i) });
      txt(s, r[0], 1 + i, { x: 0.7, y, w: 1.6, h: 0.44, fontSize: 12, bold: true, color: C.white, valign: "middle", fx: "left" });
      txt(s, r[1], 1 + i, { x: 2.35, y, w: 2.9, h: 0.44, fontSize: 12, color: i ? "8FA6C8" : C.mist, bold: !i, valign: "middle", fx: "left" });
      txt(s, r[2], 1 + i, { x: 5.25, y, w: 4.1, h: 0.44, fontSize: 12, color: i ? C.white : C.blue, bold: !i, valign: "middle", fx: "left" });
    });
    txt(s, [{ text: "Complements the Paytm AI Soundbox: ", options: { color: C.teal, bold: true } }, { text: "it tells you what sold; MITRA tells you what you missed.", options: { color: C.white } }], 8,
      { x: 0.55, y: 4.6, w: 8.9, h: 0.4, fontSize: 15, italic: true, fx: "fade" });
  }

  // 10 ── IMPACT & BENEFITS ─────────────────────────────────────────────────
  {
    const s = pres.addSlide({ masterName: "DARK" });
    bg(s, "story_10.jpg", "ov_full.png");
    kicker(s, "05 · IMPACT & BENEFITS");
    title(s, "Good for merchants, Paytm and the street");
    const cols = [
      ["LuStore", "Merchant", C.blue, ["Sell what customers already ask for", "Smaller first buys protect cash", "Honest profit: waste & leftover shown", "Voice in 22 Indian languages, 5 seconds"]],
      ["LuWallet", "Paytm", C.teal, ["Daily reason to open the merchant app", "A consented demand signal no rail has", "Pre-orders paid via Paytm links", "Trial outcomes → partner credit evidence"]],
      ["LuTruck", "Ecosystem", C.amber, ["Distributors see real local demand", "Customers find what they asked for", "Less perishable waste"]],
    ];
    for (let i = 0; i < cols.length; i++) {
      const [ic, k, col, items] = cols[i];
      const x = 0.55 + i * 3.0;
      card(s, x, 1.6, 2.85, 2.95, 2 + i * 2, C.card, col, "zoom");
      await iconDot(s, x + 0.2, 1.78, ic, col, 3 + i * 2);
      txt(s, k, 3 + i * 2, { x: x + 0.82, y: 1.84, w: 1.9, h: 0.38, fontSize: 17, bold: true, color: C.white, valign: "middle" });
      txt(s, items.map((t, j) => ({ text: t, options: { bullet: { indent: 10 }, breakLine: j < items.length - 1 } })), 3 + i * 2, { x: x + 0.2, y: 2.42, w: 2.5, h: 2.0, fontSize: 12, color: C.mist, valign: "top", paraSpaceAfter: 5 });
    }
    txt(s, "Pilot metrics we will measure, not claim: asks/day · trial sell-through · gross profit per trial · waste % · repeat use", 9, { x: 0.55, y: 4.72, w: 8.9, h: 0.3, fontSize: 11, bold: true, color: C.amber, fx: "fade" });
  }

  // 11 ── BUSINESS MODEL ─────────────────────────────────────────────────────
  {
    const s = pres.addSlide({ masterName: "DARK" });
    s.background = { color: "041533" };
    kicker(s, "06 · BUSINESS MODEL");
    title(s, "Free to capture. Paid to grow.");
    const tiers = [
      ["LuMic", "Free · Capture", "₹0", "Voice ledger + top asks inside the Paytm for Business app", C.blue],
      ["LuSparkles", "MITRA Pro", "₹149/mo*", "Opportunities, trials, supplier drafts, offline AI; bundle with Soundbox", C.teal],
      ["LuTruck", "Supplier network", "Lead fee*", "Distributors pay for consented, aggregated local demand", C.amber],
      ["LuLandmark", "Working capital", "Rev-share*", "Trial-backed stock credit via regulated partners, opt-in", C.coral],
    ];
    for (let i = 0; i < tiers.length; i++) {
      const [ic, k, price, d, col] = tiers[i];
      const x = 0.55 + i * 2.25;
      card(s, x, 1.6, 2.1, 2.95, 2 + i, C.card, col, "zoom");
      await iconDot(s, x + 0.2, 1.78, ic, col, 2 + i);
      txt(s, k, 2 + i, { x: x + 0.2, y: 2.38, w: 1.8, h: 0.32, fontSize: 13.5, bold: true, color: C.white, fx: "zoom" });
      txt(s, price, 2 + i, { x: x + 0.2, y: 2.72, w: 1.8, h: 0.45, fontSize: 21, bold: true, color: col, fx: "zoom" });
      txt(s, d, 2 + i, { x: x + 0.2, y: 3.22, w: 1.75, h: 1.25, fontSize: 11, color: C.mist, valign: "top", fx: "zoom" });
    }
    txt(s, "Low cost to serve: one small AI call per voice note (or zero, offline). Distribution via existing Paytm merchant channels.", 6, { x: 0.55, y: 4.68, w: 8.9, h: 0.25, fontSize: 11, color: C.white, fx: "fade" });
    txt(s, "* Hypotheses to validate in a pilot. Lending only through regulated partners with consent.", 7, { x: 0.55, y: 4.95, w: 8.9, h: 0.2, fontSize: 8, color: "7D93B5", fx: "fade" });
  }

  // 12 ── CLOSE ──────────────────────────────────────────────────────────────
  {
    const s = pres.addSlide({ masterName: "DARK" });
    bg(s, "story_11.jpg", "ov_bottom.png");
    txt(s, "NEXT: Soundbox voice skill · consented 30-shop Chennai pilot* · supplier quotes · expiry radar", 0, { x: 0.55, y: 2.72, w: 8.9, h: 0.3, fontSize: 11, bold: true, color: C.blue, charSpacing: 1 });
    txt(s, [{ text: "Every QR knows what sold. ", options: { color: C.white } }, { text: "MITRA hears what didn't.", options: { color: C.blue } }], 1,
      { x: 0.55, y: 3.05, w: 8.9, h: 1.2, fontSize: 32, bold: true, fontFace: "Arial", valign: "top", fx: "zoom" });
    txt(s, "Johnbosco J  ·  Jeffrey Figo J  ·  Joe Naren A  ·  Made by RivenDevs", 2, { x: 0.55, y: 4.4, w: 8.6, h: 0.35, fontSize: 14, bold: true, color: C.mist });
    txt(s, "* Requires Paytm approval and partnership; the pilot is a proposal.", 3, { x: 0.55, y: 4.82, w: 8, h: 0.2, fontSize: 8, color: "7D93B5", fx: "fade" });
  }

  await pres.writeFile({ fileName: OUT });
  console.log("wrote", OUT);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
