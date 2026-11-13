// Murugan Stores boards that replace the café's menu/banner textures (same pixel sizes as the originals).
// Run: NODE_PATH=apps/web/node_modules node assets/blender/store_boards/make_boards.cjs
const sharp = require("sharp");
const path = require("path");
const T = "Tamil Sangam MN", S = "Helvetica Neue";
const out = (n) => path.join(__dirname, n);
const svg = (w, h, body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`);
const rows = (items, x, y, w, step, size) => items.map(([ta, en, p], i) => `
  <text x="${x}" y="${y + i * step}" font-family="${T}" font-size="${size}" font-weight="700" fill="#1b1b1b">${ta}</text>
  <text x="${x}" y="${y + i * step + size * 0.95}" font-family="${S}" font-size="${size * 0.62}" fill="#5b4a3a">${en}</text>
  <text x="${x + w}" y="${y + i * step + size * 0.5}" font-family="${S}" font-size="${size * 1.05}" font-weight="700" fill="#b3261e" text-anchor="end">₹${p}</text>`).join("");

const boards = [
  // price board (menuuu.jpg 1754x1241)
  ["menuuu.jpg", 1754, 1241, `
    <rect width="1754" height="1241" fill="#fbf6ea"/><rect x="0" y="0" width="1754" height="190" fill="#0b6b3a"/>
    <text x="877" y="120" font-family="${T}" font-size="96" font-weight="700" fill="#fff" text-anchor="middle">இன்றைய விலை · TODAY'S PRICES</text>
    ${rows([["பால்", "Milk 500ml", 30], ["தயிர்", "Curd 400g", 40], ["அமுல் வெண்ணெய்", "Amul Butter 100g", 58], ["அரிசி மாவு", "Rice flour 1kg", 65], ["சர்க்கரை", "Sugar 1kg", 48]], 90, 300, 720, 185, 66)}
    ${rows([["பாதாம் பால்", "Badam Milk 200ml", 30], ["ரோஸ் மில்க்", "Rose Milk 200ml", 30], ["பில்டர் காபி", "Filter Coffee", 20], ["டீ", "Tea", 15], ["பிஸ்கட்", "Biscuits", 10]], 960, 300, 700, 185, 66)}
    <line x1="877" y1="250" x2="877" y2="1180" stroke="#d8cdb6" stroke-width="4"/>`],
  // fresh-today board (cafeee.jpg 736x1041)
  ["cafeee.jpg", 736, 1041, `
    <rect width="736" height="1041" fill="#fff7e0"/><circle cx="368" cy="330" r="190" fill="#6b3e1f"/>
    <text x="368" y="300" font-family="${T}" font-size="70" font-weight="700" fill="#ffe9c7" text-anchor="middle">பில்டர்</text>
    <text x="368" y="390" font-family="${T}" font-size="70" font-weight="700" fill="#ffe9c7" text-anchor="middle">காபி</text>
    <text x="368" y="640" font-family="${S}" font-size="62" font-weight="800" fill="#0b6b3a" text-anchor="middle">FILTER COFFEE</text>
    <text x="368" y="720" font-family="${S}" font-size="40" fill="#5b4a3a" text-anchor="middle">Fresh decoction · all day</text>
    <text x="368" y="880" font-family="${S}" font-size="120" font-weight="800" fill="#b3261e" text-anchor="middle">₹20</text>`],
  // UPI board (caaaaaaaaaaaaaaaaaa.jpg 636x886)
  ["caaaaaaaaaaaaaaaaaa.jpg", 636, 886, `
    <rect width="636" height="886" fill="#f2f7ff"/><rect x="60" y="80" width="516" height="90" rx="20" fill="#002e6e"/>
    <text x="318" y="140" font-family="${S}" font-size="48" font-weight="800" fill="#fff" text-anchor="middle">SCAN &amp; PAY</text>
    <rect x="148" y="230" width="340" height="340" fill="#fff" stroke="#002e6e" stroke-width="10"/>
    ${Array.from({ length: 100 }, (_, i) => ((i * 37) % 7 < 3 ? `<rect x="${168 + (i % 10) * 30}" y="${250 + Math.floor(i / 10) * 30}" width="28" height="28" fill="#0b1f3a"/>` : "")).join("")}
    <text x="318" y="660" font-family="${S}" font-size="44" font-weight="700" fill="#002e6e" text-anchor="middle">UPI accepted</text>
    <text x="318" y="730" font-family="${T}" font-size="38" fill="#002e6e" text-anchor="middle">யுபிஐ ஏற்கப்படும்</text>
    <text x="318" y="800" font-family="${S}" font-size="30" fill="#5a6577" text-anchor="middle">Pre-order by phone too</text>`],
  // store banner (wlccccc.jpg 697x248) — was "COFFEE HOUSE"
  ["wlccccc.jpg", 697, 248, `
    <rect width="697" height="248" fill="#7a1d12"/><rect x="10" y="10" width="677" height="228" fill="none" stroke="#e7c06a" stroke-width="4"/>
    <text x="348" y="108" font-family="${T}" font-size="70" font-weight="700" fill="#ffe9a8" text-anchor="middle">முருகன் ஸ்டோர்ஸ்</text>
    <text x="348" y="168" font-family="${S}" font-size="40" font-weight="800" fill="#fff" text-anchor="middle" letter-spacing="6">MURUGAN STORES</text>
    <text x="348" y="212" font-family="${S}" font-size="24" fill="#f3d9a4" text-anchor="middle">Velachery · since 2004</text>`],
  // wide poster (1600w-duoZ6eo9cJM.jpg 1600x800) — was "GRAND OPENING"
  ["1600w-duoZ6eo9cJM.jpg", 1600, 800, `
    <rect width="1600" height="800" fill="#fffaf0"/><rect x="0" y="0" width="1600" height="150" fill="#0b6b3a"/>
    <text x="800" y="102" font-family="${S}" font-size="64" font-weight="800" fill="#fff" text-anchor="middle">YOUR NEIGHBOURHOOD STORE</text>
    <text x="800" y="330" font-family="${T}" font-size="110" font-weight="700" fill="#7a1d12" text-anchor="middle">பால் · மளிகை · காபி</text>
    <text x="800" y="460" font-family="${S}" font-size="64" fill="#3b2f25" text-anchor="middle">Milk · Groceries · Snacks · Filter coffee</text>
    <text x="800" y="640" font-family="${S}" font-size="54" font-weight="700" fill="#b3261e" text-anchor="middle">Didn't find it? Ask Murugan anna. We'll get it.</text>`],
];
(async () => {
  for (const [name, w, h, body] of boards) {
    await sharp(svg(w, h, body)).jpeg({ quality: 90 }).toFile(out(name));
    console.log("board", name);
  }
})();
