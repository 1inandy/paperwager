import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PaperWager — Simulated Sports Betting",
  description:
    "Make paper bets on real events across dozens of sports without risking real money.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
