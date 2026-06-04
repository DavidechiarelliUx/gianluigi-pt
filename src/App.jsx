import { MainLayout, Section } from "./components/layout";
import {
  Hero,
  Stats,
  About,
  Services,
  Method,
  PreviewApp,
  PreviewLive,
  PreviewPricing,
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
      {/* HERO premium */}
      <Hero />

      {/* STAT con count-up */}
      <Section id="stat" surface>
        <Stats />
      </Section>

      {/* CHI SONO */}
      <Section id="chi-sono">
        <About />
      </Section>

      {/* SERVIZI */}
      <Section id="servizi" surface>
        <Services />
      </Section>

      {/* METODO */}
      <Section id="metodo">
        <Method />
      </Section>

      {/* ANTEPRIMA PRODOTTO — App allenamenti (Fase 2) */}
      <Section id="app" surface>
        <PreviewApp />
      </Section>

      {/* ANTEPRIMA PRODOTTO — Sessioni live (Fase 3) */}
      <Section id="live">
        <PreviewLive />
      </Section>

      {/* ANTEPRIMA PRODOTTO — Pagamenti e pacchetti (Fase 3) */}
      <Section id="pacchetti" surface>
        <PreviewPricing />
      </Section>

      {/* RISULTATI / PROVA SOCIALE */}
      <Section id="risultati" surface>
        <Results />
      </Section>

      {/* CONTATTI — form reale */}
      <Section id="contatti">
        <Contact />
      </Section>
    </MainLayout>
  );
}
