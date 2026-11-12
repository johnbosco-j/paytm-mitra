import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter, Noto_Sans_Tamil } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const tamil = Noto_Sans_Tamil({ variable: "--font-tamil", subsets: ["tamil"], weight: ["400", "600", "700"] });

export const metadata: Metadata = {
  title: "MITRA for Paytm merchants · Missed-demand Intelligence",
  description:
    "MITRA hears the sales your QR never sees. Capture missed customer requests in Tamil or English, see profit-aware stocking trials, approve and prove results.",
  appleWebApp: { capable: true, title: "MITRA", statusBarStyle: "default" },
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
};

export const viewport: Viewport = { themeColor: "#002e6e", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} ${tamil.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
