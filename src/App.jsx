import { MainLayout, Section } from "./components/layout";
import {
  Hero,
  About,
  Services,
  Results,
  Contact,
} from "./components/home";

/**
 * F1.12 — Sito vetrina premium completo: hero, sezioni core, anteprime
 * prodotto, prova sociale e form contatto reale.
 */
export default function App() {
  return (
    <MainLayout>
      <Hero />

      <Section id="chi-sono">
        <About />
      </Section>

      <Section id="servizi" surface>
        <Services />
      </Section>

      <Section id="risultati">
        <Results />
      </Section>

      <Section id="contatti" surface>
        <Contact />
      </Section>
    </MainLayout>
  );
}
