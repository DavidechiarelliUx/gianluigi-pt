import { Calendar } from "lucide-react";
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
} from "./components/home";
import { Button, GlowPanel } from "./components/ui";

/**
 * F1.8 — Vetrina + anteprime prodotto + Risultati/prova sociale.
 * Form contatto reale (F1.12) resta segnaposto.
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

      {/* CONTATTI (placeholder — F1.12) */}
      <Section id="contatti">
        <GlowPanel breathe className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-display font-display font-bold uppercase">Pronto a iniziare?</h2>
          <p className="text-text-muted">Form contatto reale in arrivo (F1.12).</p>
          <Button size="lg">
            <Calendar size={18} /> Prenota una consulenza
          </Button>
        </GlowPanel>
      </Section>
    </MainLayout>
  );
}
