// Renders one caption bar PNG per scene (ffmpeg here has no drawtext). NODE_PATH=apps/web/node_modules node pitch/video/captions.cjs
const fs = require("fs"), path = require("path"), sharp = require("sharp");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
(async () => {
  for (const s of JSON.parse(fs.readFileSync(path.join(__dirname, "script.json"), "utf8"))) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="120"><rect width="1920" height="120" fill="#002E6E" fill-opacity="0.9"/><rect width="1920" height="5" fill="#00BAF2"/>
      <text x="960" y="76" font-family="Helvetica Neue, Arial" font-size="44" font-weight="700" fill="#fff" text-anchor="middle">${esc(s.caption)}</text></svg>`;
    await sharp(Buffer.from(svg)).png().toFile(path.join(__dirname, "captions", s.id + ".png"));
  }
  console.log("captions done");
})();
