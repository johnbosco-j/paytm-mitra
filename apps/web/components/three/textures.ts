"use client";

// Procedural canvas textures: everything original, generated at runtime (no downloaded assets).
import * as THREE from "three";

const cache = new Map<string, THREE.Texture>();

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function make(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, opts?: { repeat?: [number, number]; srgb?: boolean }) {
  const k = key + (opts?.repeat?.join("x") ?? "");
  const hit = cache.get(k);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  draw(g, rng(key.length * 9973 + w));
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  if (opts?.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
  if (opts?.repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...opts.repeat);
  }
  cache.set(k, t);
  return t;
}

function noise(g: CanvasRenderingContext2D, r: () => number, w: number, h: number, n: number, color: string, size = 2, alpha = 0.08) {
  g.fillStyle = color;
  for (let i = 0; i < n; i++) {
    g.globalAlpha = alpha * r();
    g.fillRect(r() * w, r() * h, size * r() + 0.5, size * r() + 0.5);
  }
  g.globalAlpha = 1;
}

function stains(g: CanvasRenderingContext2D, r: () => number, w: number, h: number, n: number, color: string) {
  for (let i = 0; i < n; i++) {
    const x = r() * w;
    const y = r() * h * 0.4;
    const grd = g.createLinearGradient(x, y, x, y + h * (0.3 + r() * 0.5));
    grd.addColorStop(0, color);
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.globalAlpha = 0.08 + r() * 0.12;
    g.fillRect(x, y, 6 + r() * 30, h);
  }
  g.globalAlpha = 1;
}

/** Weathered painted plaster, typical of Chennai shopfronts. */
export const plaster = (base: string, repeat: [number, number] = [1, 1]) =>
  make(`plaster-${base}`, 512, 512, (g, r) => {
    g.fillStyle = base;
    g.fillRect(0, 0, 512, 512);
    noise(g, r, 512, 512, 9000, "#000", 3, 0.09);
    noise(g, r, 512, 512, 4000, "#fff", 2, 0.07);
    stains(g, r, 512, 512, 14, "rgba(40,30,20,1)");
  }, { repeat });

export const concrete = (repeat: [number, number] = [6, 6]) =>
  make("concrete", 512, 512, (g, r) => {
    g.fillStyle = "#8d8a84";
    g.fillRect(0, 0, 512, 512);
    noise(g, r, 512, 512, 14000, "#000", 2, 0.12);
    noise(g, r, 512, 512, 6000, "#fff", 2, 0.08);
    g.strokeStyle = "rgba(0,0,0,0.25)";
    g.lineWidth = 2;
    for (let i = 0; i <= 4; i++) {
      g.beginPath();
      g.moveTo(0, i * 128);
      g.lineTo(512, i * 128);
      g.stroke();
    }
  }, { repeat });

export const asphalt = (repeat: [number, number] = [10, 2]) =>
  make("asphalt", 512, 512, (g, r) => {
    g.fillStyle = "#2b2b2d";
    g.fillRect(0, 0, 512, 512);
    noise(g, r, 512, 512, 22000, "#fff", 2, 0.06);
    noise(g, r, 512, 512, 12000, "#000", 3, 0.15);
    for (let i = 0; i < 6; i++) {
      g.fillStyle = "rgba(0,0,0,0.25)";
      g.beginPath();
      g.ellipse(r() * 512, r() * 512, 40 + r() * 60, 10 + r() * 20, r() * 3, 0, Math.PI * 2);
      g.fill();
    }
  }, { repeat });

export const wood = (repeat: [number, number] = [1, 1]) =>
  make("wood", 512, 256, (g, r) => {
    g.fillStyle = "#6b4226";
    g.fillRect(0, 0, 512, 256);
    for (let y = 0; y < 256; y += 2) {
      g.strokeStyle = `rgba(${40 + r() * 30},${20 + r() * 15},${10},${0.15 + r() * 0.2})`;
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin(x * 0.02 + y * 0.1) * 2 * r());
      g.stroke();
    }
    noise(g, r, 512, 256, 3000, "#000", 2, 0.1);
  }, { repeat });

/** Corrugated rolling shutter (ribbed metal with rust streaks). */
export const shutter = () =>
  make("shutter", 256, 512, (g, r) => {
    for (let y = 0; y < 512; y += 16) {
      const grd = g.createLinearGradient(0, y, 0, y + 16);
      grd.addColorStop(0, "#9aa0a6");
      grd.addColorStop(0.5, "#cfd4d8");
      grd.addColorStop(1, "#6f757b");
      g.fillStyle = grd;
      g.fillRect(0, y, 256, 16);
    }
    stains(g, r, 256, 512, 10, "rgba(120,60,20,1)");
    noise(g, r, 256, 512, 3000, "#000", 2, 0.1);
  });

/** Painted signboard with Tamil + English shop name (the browser shapes Tamil correctly). */
export const signboard = (ta: string, en: string) =>
  make(`sign-${en}`, 1024, 256, (g, r) => {
    const grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, "#f4c430");
    grd.addColorStop(1, "#e2a514");
    g.fillStyle = grd;
    g.fillRect(0, 0, 1024, 256);
    g.strokeStyle = "#b5121b";
    g.lineWidth = 10;
    g.strokeRect(10, 10, 1004, 236);
    g.fillStyle = "#b5121b";
    g.textAlign = "center";
    g.font = "700 92px 'Noto Sans Tamil', 'Tamil Sangam MN', 'Nirmala UI', sans-serif";
    g.fillText(ta, 512, 120);
    g.fillStyle = "#0d3b66";
    g.font = "800 58px 'Arial Black', Arial, sans-serif";
    g.fillText(en, 512, 205);
    noise(g, r, 1024, 256, 5000, "#000", 2, 0.06);
    stains(g, r, 1024, 256, 6, "rgba(60,40,10,1)");
  });

const LABELS = [
  ["#e63946", "#fff", "BISCUIT"], ["#1d3557", "#ffd166", "MASALA"], ["#2a9d8f", "#fff", "SOAP"], ["#f4a261", "#3d2c1e", "TEA"],
  ["#6a4c93", "#fff", "CHOCO"], ["#ffbe0b", "#3a2e00", "DAL"], ["#06d6a0", "#003b2f", "RICE"], ["#ef476f", "#fff", "CHIPS"],
  ["#118ab2", "#fff", "OIL"], ["#8338ec", "#fff", "NOODLES"], ["#fb5607", "#fff", "SNACK"], ["#3a86ff", "#fff", "SALT"],
] as const;

/** Atlas of 12 product label designs; UVs pick a cell. */
export const productAtlas = () =>
  make("labels", 1024, 768, (g, r) => {
    LABELS.forEach(([bg, fg, word], i) => {
      const x = (i % 4) * 256;
      const y = Math.floor(i / 4) * 256;
      g.fillStyle = bg;
      g.fillRect(x, y, 256, 256);
      g.fillStyle = "rgba(255,255,255,0.18)";
      g.beginPath();
      g.arc(x + 70 + r() * 120, y + 90, 50 + r() * 40, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = fg;
      g.font = "900 40px Arial, sans-serif";
      g.textAlign = "center";
      g.fillText(word, x + 128, y + 150);
      g.font = "600 20px Arial, sans-serif";
      g.fillText("100g", x + 128, y + 190);
      g.fillStyle = "rgba(0,0,0,0.25)";
      g.fillRect(x, y + 230, 256, 26);
    });
  });

/** Mango lassi bottle label. */
export const lassiLabel = () =>
  make("lassi", 256, 256, (g) => {
    g.fillStyle = "#ffb703";
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = "#fb8500";
    g.beginPath();
    g.ellipse(128, 110, 70, 55, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#fff";
    g.font = "900 44px Arial";
    g.textAlign = "center";
    g.fillText("LASSI", 128, 205);
  });

/** Generic payment QR standee art (a decorative pattern, not a real payable code). */
export const qrStandee = () =>
  make("qr", 256, 384, (g, r) => {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, 256, 384);
    g.fillStyle = "#0b3d91";
    g.fillRect(0, 0, 256, 70);
    g.fillStyle = "#fff";
    g.font = "800 34px Arial";
    g.textAlign = "center";
    g.fillText("SCAN & PAY", 128, 48);
    const s = 8;
    for (let y = 0; y < 23; y++)
      for (let x = 0; x < 23; x++) if (r() > 0.52) {
        g.fillStyle = "#111";
        g.fillRect(36 + x * s, 92 + y * s, s, s);
      }
    for (const [cx, cy] of [[36, 92], [164, 92], [36, 220]]) {
      g.fillStyle = "#111";
      g.fillRect(cx, cy, 56, 56);
      g.fillStyle = "#fff";
      g.fillRect(cx + 8, cy + 8, 40, 40);
      g.fillStyle = "#111";
      g.fillRect(cx + 16, cy + 16, 24, 24);
    }
    g.fillStyle = "#0b3d91";
    g.font = "700 22px Arial";
    g.fillText("UPI accepted", 128, 350);
  });

/** Soft radial glow sprite. */
export const glow = () =>
  make("glow", 128, 128, (g) => {
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.3, "rgba(255,255,255,0.5)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
  });

/** Tamil movie-poster style wall paint / ad (adds street character). */
export const wallAd = (title: string, color: string) =>
  make(`ad-${title}`, 512, 256, (g, r) => {
    g.fillStyle = color;
    g.fillRect(0, 0, 512, 256);
    g.fillStyle = "rgba(255,255,255,0.9)";
    g.font = "800 64px 'Noto Sans Tamil', 'Tamil Sangam MN', Arial";
    g.textAlign = "center";
    g.fillText(title, 256, 150);
    noise(g, r, 512, 256, 6000, "#000", 3, 0.12);
    stains(g, r, 512, 256, 8, "rgba(0,0,0,1)");
  });


/** Clean modern store fascia (illuminated letters on dark glass). */
export const storeSign = (title: string, sub: string) =>
  make(`sign-${title}`, 1024, 192, (g) => {
    g.fillStyle = "#14161c";
    g.fillRect(0, 0, 1024, 192);
    g.fillStyle = "#f5f1e8";
    g.font = "700 92px -apple-system, 'SF Pro Display', 'Helvetica Neue', Arial";
    g.textAlign = "center";
    g.fillText(title, 512, 112);
    g.fillStyle = "#c9a96e";
    g.font = "500 34px -apple-system, 'SF Pro Text', 'Helvetica Neue', Arial";
    g.fillText(sub, 512, 165);
  });

/** Alpha-cut cluster of small neem-like leaves (for instanced leaf cards). */
export const leafCard = () =>
  make("leaf", 256, 256, (g, r) => {
    g.clearRect(0, 0, 256, 256);
    for (let i = 0; i < 46; i++) {
      const x = 30 + r() * 196;
      const y = 30 + r() * 196;
      const a = r() * Math.PI * 2;
      const l = 22 + r() * 26;
      const shade = 70 + Math.floor(r() * 70);
      g.save();
      g.translate(x, y);
      g.rotate(a);
      g.fillStyle = `rgb(${Math.floor(shade * 0.45)},${shade + 30},${Math.floor(shade * 0.35)})`;
      g.beginPath();
      g.ellipse(0, 0, l, l * 0.28, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "rgba(20,40,10,0.5)";
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(-l, 0);
      g.lineTo(l, 0);
      g.stroke();
      g.restore();
    }
  });
