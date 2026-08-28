/* Central place for the practice's real data so it is edited in one spot.
   Values marked TODO are placeholders from the brief — swap them when available. */
export const site = {
  brand: "Trycholog Maszynowska",
  person: "Zofia Maszynowska",
  role: "Trycholog dyplomowany",
  city: "Pruszcz Gdański",
  phoneDisplay: "666 161 191",
  phoneHref: "tel:+48666161191",
  email: "trycholog.maszynowska@gmail.com",
  address: {
    line1: "ul. Kasprowicza 52/3",
    line2: "83-000 Pruszcz Gdański",
    note: "Lokal apteki · parking przed wejściem",
  },
  hours: ["pon.–pt. 7:00–21:00", "sob. 9:00–19:00", "niedz. 9:00–18:00"],
  booksyUrl:
    "https://booksy.com/pl-pl/356124_trycholog-maszynowska_inni_21804_pruszcz-gdanski#ba_s=seo",
  instagramUrl: "https://www.instagram.com/maszyna.w.trychologii/",
  instagramHandle: "@maszyna.w.trychologii",
  // Wizytówka + opinie Google (link „udostępnij" z Map Google)
  googleUrl: "https://share.google/Orz3agY9cTLl4PStI",
  mapsUrl:
    "https://maps.google.com/?q=ul.+Kasprowicza+52/3,+83-000+Pruszcz+Gda%C5%84ski",
  consultationPrice: "190 zł",
  // TODO (z briefu, do uzupełnienia): pełna nazwa firmy, NIP, adres rejestrowy,
  // regulamin i polityka prywatności.
  legal: { company: "", nip: "" },
};

export const nav = [
  { href: "#podejscie", label: "Podejście" },
  { href: "#offer", label: "Konsultacja" },
  { href: "#diagnostyka", label: "Diagnostyka" },
  { href: "#efekty", label: "Efekty" },
  { href: "#cennik", label: "Cennik" },
  { href: "#faq", label: "FAQ" },
];
