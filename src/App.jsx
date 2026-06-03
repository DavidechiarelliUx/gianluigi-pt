import { motion } from "framer-motion";
import { ArrowRight, Calendar } from "lucide-react";
import { MainLayout, Section } from "./components/layout";
import { Button, Badge, StatCard, SectionHeader, MotionCard, GlowPanel } from "./components/ui";

/**
 * F1.4 — Prima struttura di pagina sopra il layout base.
 * Sezioni reali (hero curato, servizi, ecc.) arrivano nei task F1.5+.
 */
export default function App() {
  return (
    <MainLayout>
      {/* HERO */}
      <Section id="hero" className="pt-24">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="space-y-6"
          >
            <Badge variant="neon">Personal Trainer</Badge>
            <h1 className="text-hero font-display font-extrabold uppercase">
              Trasforma il tuo <span className="text-accent">fisico</span>
            </h1>
            <p className="max-w-md text-text-muted">
              Allenamento su misura, metodo e risultati reali. Online e in studio.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" onClick={() => (window.location.hash = "#contatti")}>
                <Calendar size={18} /> Prenota consulenza
              </Button>
              <Button variant="secondary" size="lg" onClick={() => (window.location.hash = "#servizi")}>
                Scopri di più <ArrowRight size={18} />
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          >
            <GlowPanel breathe className="flex aspect-[4/5] items-center justify-center">
              <span className="font-display text-text-muted">[ Foto PT ]</span>
            </GlowPanel>
          </motion.div>
        </div>
      </Section>

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
