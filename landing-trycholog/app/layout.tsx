import type { Metadata } from "next";
import { site } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://gabinet-maszynowska.pl"),
  title: {
    default:
      "Trycholog Pruszcz Gdański — diagnostyka włosów i skóry głowy | Zofia Maszynowska",
    template: "%s | Gabinet Maszynowska",
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
  authors: [{ name: site.name }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pl_PL",
    title: "Trycholog Pruszcz Gdański — Zofia Maszynowska",
    description:
      "Diagnostyka włosów i skóry głowy oparta na dowodach: badanie mikrokamerą, interpretacja badań krwi i celowany plan kuracji. Konsultacja 190 zł.",
    siteName: "Gabinet Maszynowska",
  },
  robots: { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": ["HealthAndBeautyBusiness", "MedicalBusiness"],
  name: `Gabinet trychologiczny ${site.name}`,
  description:
    "Gabinet trychologiczny — diagnostyka włosów i skóry głowy mikrokamerą, celowany plan kuracji.",
  telephone: "+48666161191",
  email: site.email,
  priceRange: "190–3800 zł",
  address: {
    "@type": "PostalAddress",
    streetAddress: "ul. Kasprowicza 52/3",
    postalCode: "83-000",
    addressLocality: "Pruszcz Gdański",
    addressCountry: "PL",
  },
  areaServed: ["Pruszcz Gdański", "Tczew", "Gdańsk", "Trójmiasto"],
  openingHours: ["Mo-Fr 07:00-21:00", "Sa 09:00-19:00", "Su 09:00-18:00"],
  sameAs: [site.instagramUrl],
  founder: { "@type": "Person", name: site.name, jobTitle: site.role },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Mulish:wght@400;500;600;700;800&display=swap"
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
