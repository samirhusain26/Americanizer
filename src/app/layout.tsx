import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Americanizer",
  description: "Tactile metric ↔ US unit converter",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#14130F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
