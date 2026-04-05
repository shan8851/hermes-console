import type { Metadata } from "next";
import { Bricolage_Grotesque, JetBrains_Mono, Outfit } from "next/font/google";

import { AppShell } from "@/components/app-shell/app-shell";

import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hermes Console",
  description: "Local-first visibility dashboard for Hermes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${outfit.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-dvh bg-bg text-fg">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
