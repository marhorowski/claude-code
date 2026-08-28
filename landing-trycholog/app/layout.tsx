import type { Metadata } from "next";
import { site } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://trycholog-maszynowska.pl"),
  title: {
    default:
      "Trycholog Pruszcz Gdański — diagnostyka włosów i skóry głowy | Trycholog Maszynowska",
    template: "%s | Trycholog Maszynowska",
  },
  description:
    "Gabinet trychologiczny w Pruszczu Gdańskim. Diagnostyka włosów i skóry głowy mikrokamerą, badania krwi i celowany plan kuracji. Konsultacja 190 zł — rezerwacja online przez Booksy.",
  keywords: [
    "trycholog Pruszcz Gdański",
    "trycholog Trójmiasto",
    "diagnostyka włosów",
    "wypadanie włosów",
    "łupież",
    "łojotokowe zapalenie skóry",
    "trichoskopia",
    "gabinet trychologiczny",
    "łysienie androgenowe",
    "konsultacja trychologiczna",
  ],
  authors: [{ name: site.person }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pl_PL",
    title: "Trycholog Pruszcz Gdański — Trycholog Maszynowska",
    description:
      "Diagnostyka włosów i skóry głowy oparta na dowodach: badanie mikrokamerą, interpretacja badań krwi i celowany plan kuracji. Konsultacja 190 zł.",
    siteName: "Trycholog Maszynowska",
  },
  robots: { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": ["HealthAndBeautyBusiness", "MedicalBusiness"],
  name: `Gabinet trychologiczny ${site.person}`,
  description:
    "Gabinet trychologiczny — diagnostyka włosów i skóry głowy mikrokamerą, celowany plan kuracji.",
  telephone: "+48666161191",
  email: site.email,
  priceRange: "od 190 zł",
  address: {
    "@type": "PostalAddress",
    streetAddress: "ul. Kasprowicza 52/3",
    postalCode: "83-000",
    addressLocality: "Pruszcz Gdański",
    addressCountry: "PL",
  },
  areaServed: ["Pruszcz Gdański", "Tczew", "Gdańsk", "Trójmiasto"],
  openingHours: ["Mo-Fr 07:00-21:00", "Sa 09:00-19:00", "Su 09:00-18:00"],
  sameAs: [site.instagramUrl, site.googleUrl],
  founder: { "@type": "Person", name: site.person, jobTitle: site.role },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,500&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
