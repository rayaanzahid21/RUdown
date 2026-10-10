import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RUdown — Less planning. More going.",
  description: "Find your group's next good time. Shared plans, fair budgets, maps, and a little less group chat.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
