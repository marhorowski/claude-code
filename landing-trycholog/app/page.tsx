import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Faq from "@/components/Faq";
import Booking from "@/components/Booking";
import {
  Hero,
  Wave,
  Stats,
  Problem,
  Approach,
  HelpWith,
  Offer,
  Diagnostics,
  Process,
  Treatments,
  Myths,
  Cases,
  About,
  Pricing,
} from "@/components/Sections";

export default function Home() {
  return (
    <>
      <a href="#offer" className="skip">
        Przejdź do umówienia konsultacji
      </a>
      <Header />
      <main id="top">
        <Hero />
        <Wave />
        <Stats />
        <Approach />
        <Problem />
        <HelpWith />
        <Offer />
        <Diagnostics />
        <Process />
        <Treatments />
        <Myths />
        <Cases />
        <About />
        <Pricing />
        <Faq />
        <Booking />
      </main>
      <Footer />
    </>
  );
}
