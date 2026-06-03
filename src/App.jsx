import { Calendar } from "lucide-react";
import { MainLayout, Section } from "./components/layout";
import { Hero } from "./components/home";
import { Button, StatCard, SectionHeader, MotionCard, GlowPanel } from "./components/ui";

/**
 * F1.5 — Hero premium dedicato + struttura pagina.
 * Le altre sezioni reali (servizi, chi sono, metodo…) arrivano in F1.7+.
 */
export default function App() {
  return (
    <MainLayout>
      {/* HERO premium */}
      <Hero />

      {/* STAT */}
      <Section id="stat" surface>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <StatCard value="500+" label="Clienti seguiti" />
          <StatCard value="12.000" label="Kg sollevati" />
          <StatCard value="10" label="Anni esperienza" />
        </div>
      </Section>

      {/* SERVIZI (placeholder) */}
      <Section id="servizi">
        <SectionHeader eyebrow="Cosa offro" title="Servizi" align="center" />
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {["Personal Training", "Coaching Online", "Ricomposizione"].map((s, i) => (
            <MotionCard key={s} delay={i * 0.1}>
              <h3 className="font-display text-xl uppercase">{s}</h3>
              <p className="mt-1 text-sm text-text-muted">Descrizione in arrivo (F1.7).</p>
            </MotionCard>
          ))}
        </div>
      </Section>

      {/* Sezioni segnaposto per ancore navbar */}
      <Section id="chi-sono" surface>
        <SectionHeader eyebrow="Chi sono" title="Gianluigi Chiarelli" />
        <p className="mt-4 max-w-2xl text-text-muted">Contenuto in arrivo (F1.7).</p>
      </Section>

      <Section id="metodo">
        <SectionHeader eyebrow="Il metodo" title="Come lavoro" />
        <p className="mt-4 max-w-2xl text-text-muted">Step 01 → 04 in arrivo (F1.7).</p>
      </Section>

      <Section id="risultati" surface>
        <SectionHeader eyebrow="Risultati" title="Trasformazioni" />
        <p className="mt-4 max-w-2xl text-text-muted">Gallery in arrivo (F1.10).</p>
      </Section>

      {/* CTA + CONTATTI (placeholder) */}
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
