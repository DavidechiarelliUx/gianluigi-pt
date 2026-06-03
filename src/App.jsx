import { Calendar } from "lucide-react";
import { MainLayout, Section } from "./components/layout";
import { Hero, Stats, About, Services, Method } from "./components/home";
import { Button, SectionHeader, GlowPanel } from "./components/ui";

/**
 * F1.6 — Sito vetrina con sezioni reali (Chi sono, Servizi, Metodo) + stat count-up.
 * Risultati (F1.10) e form contatto reale (F1.12) restano segnaposto.
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

      {/* RISULTATI (placeholder — F1.10) */}
      <Section id="risultati" surface>
        <SectionHeader eyebrow="Risultati" title="Trasformazioni" />
        <p className="mt-4 max-w-2xl text-text-muted">Gallery in arrivo (F1.10).</p>
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
