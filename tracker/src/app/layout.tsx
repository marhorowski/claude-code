import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";

// Manrope: nagłówki i liczby (800), Inter: tekst — wg design systemu TrifectaOS.
const manrope = Manrope({ subsets: ["latin", "latin-ext"], weight: ["500", "700", "800"], variable: "--font-manrope" });
const inter = Inter({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700"], variable: "--font-inter" });

export const metadata: Metadata = { title: "TrifectaOS · Tracker marketingu i sprzedaży" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={`${manrope.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
