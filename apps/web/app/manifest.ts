import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MITRA for Paytm merchants",
    short_name: "MITRA",
    description: "Capture missed customer demand by voice in Tamil or English and turn it into safe, profitable stocking decisions.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f3f6fa",
    theme_color: "#002e6e",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
