import type { Metadata, Viewport } from "next";
import { AppPlatform } from './components/AppPlatform';
import "./globals.css";
import "./mobile.css";
import "./feedback.css";
import "./theme.css";
import "./product.css";

export const metadata: Metadata = {
  title: "RUdown — Less planning. More going.",
  description: "Find your group's next good time. Shared plans, fair budgets, maps, and a little less group chat.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = { width:'device-width', initialScale:1, viewportFit:'cover', themeColor:'#f5f0e7' };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head><link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials"/><meta name="apple-mobile-web-app-capable" content="yes"/><meta name="apple-mobile-web-app-title" content="RUdown"/></head>
      <body className="antialiased"><AppPlatform>{children}</AppPlatform></body>
    </html>
  );
}
