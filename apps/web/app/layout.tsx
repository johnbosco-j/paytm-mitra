import type { Metadata, Viewport } from "next";
import { Google_Sans, Google_Sans_Code, Google_Sans_Flex } from "next/font/google";
import "./globals.css";

// Google's own typefaces (served by Google Fonts) with Apple's SF Pro as the native fallback on Apple devices.
const gsans = Google_Sans({ variable: "--font-gsans", subsets: ["latin", "tamil"], weight: ["400", "500", "600", "700"], display: "swap" });
const gflex = Google_Sans_Flex({ variable: "--font-gflex", subsets: ["latin"], weight: "variable", axes: ["wdth", "opsz", "ROND"], display: "swap" });
const gcode = Google_Sans_Code({ variable: "--font-gcode", subsets: ["latin"], weight: ["400", "600"], display: "swap" });
import { Providers } from "@/components/providers";


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
    <html lang="en" className={`${gsans.variable} ${gflex.variable} ${gcode.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
