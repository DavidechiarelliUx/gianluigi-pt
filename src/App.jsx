import { motion } from "framer-motion";
import { Dumbbell, ArrowRight, Zap, Calendar, Trophy } from "lucide-react";
import {
  Button,
  Card,
  Input,
  Textarea,
  Badge,
  StatCard,
  SectionHeader,
  Container,
  GlowPanel,
  MotionCard,
} from "./components/ui";

/**
 * F1.3 — Mini styleguide: mostra tutti i primitivi del design system.
 * Temporanea: verrà sostituita dalle sezioni reali del sito (F1.4+).
 */
export default function App() {
  return (
    <main className="min-h-screen bg-bg py-section text-text">
      <Container className="space-y-16">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="space-y-3"
        >
          <Badge variant="neon">
            <Dumbbell size={14} /> Gianluigi PT — Styleguide
          </Badge>
          <h1 className="text-hero font-display font-extrabold uppercase">
            Black <span className="text-accent">+</span> Neon
          </h1>
          <p className="text-text-muted">
            F1.3 — design system primitives. Verifica visiva dei componenti.
          </p>
        </motion.header>

        {/* Bottoni */}
        <section className="space-y-4">
          <SectionHeader eyebrow="UI" title="Bottoni" />
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="primary">
              Prenota <ArrowRight size={18} />
            </Button>
            <Button variant="secondary">Scopri di più</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Elimina</Button>
            <Button variant="primary" size="sm">
              Small
            </Button>
            <Button variant="primary" size="lg">
              Large
            </Button>
            <Button variant="primary" disabled>
              Disabled
            </Button>
          </div>
        </section>

        {/* Badge */}
        <section className="space-y-4">
          <SectionHeader eyebrow="UI" title="Badge" />
          <div className="flex flex-wrap gap-3">
            <Badge>Default</Badge>
            <Badge variant="neon">
              <Zap size={12} /> Neon
            </Badge>
            <Badge variant="soon">Coming soon</Badge>
          </div>
        </section>

        {/* Stat */}
        <section className="space-y-4">
          <SectionHeader eyebrow="Risultati" title="StatCard" align="center" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <StatCard value="500+" label="Clienti seguiti" />
            <StatCard value="12.000" label="Kg sollevati" />
            <StatCard value="10" label="Anni esperienza" />
          </div>
        </section>

        {/* Card + MotionCard */}
        <section className="space-y-4">
          <SectionHeader eyebrow="Contenuti" title="Card & MotionCard" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Card hover>
              <Trophy className="mb-3 text-accent" />
              <h3 className="font-display text-xl uppercase">Card hover</h3>
              <p className="mt-1 text-sm text-text-muted">
                Bordo neon e lift al passaggio.
              </p>
            </Card>
            {["Forza", "Performance"].map((t, i) => (
              <MotionCard key={t} delay={i * 0.1}>
                <Zap className="mb-3 text-accent" />
                <h3 className="font-display text-xl uppercase">{t}</h3>
                <p className="mt-1 text-sm text-text-muted">
                  Entra in viewport + hover lift.
                </p>
              </MotionCard>
            ))}
          </div>
        </section>

        {/* GlowPanel */}
        <section className="space-y-4">
          <SectionHeader eyebrow="Premium" title="GlowPanel" />
          <div className="grid gap-4 sm:grid-cols-2">
            <GlowPanel>
              <h3 className="font-display text-xl uppercase">Glow statico</h3>
              <p className="mt-1 text-sm text-text-muted">
                Pannello premium con glow neon costante.
              </p>
            </GlowPanel>
            <GlowPanel breathe>
              <h3 className="font-display text-xl uppercase">Glow che respira</h3>
              <p className="mt-1 text-sm text-text-muted">
                Animazione neon-breathe (CTA d'impatto).
              </p>
            </GlowPanel>
          </div>
        </section>

        {/* Form */}
        <section className="space-y-4">
          <SectionHeader eyebrow="Form" title="Input & Textarea" />
          <div className="grid max-w-xl gap-4">
            <div className="space-y-2">
              <label className="text-sm uppercase tracking-wide text-text-muted">
                Nome
              </label>
              <Input placeholder="Il tuo nome" />
            </div>
            <div className="space-y-2">
              <label className="text-sm uppercase tracking-wide text-text-muted">
                Email (errore)
              </label>
              <Input placeholder="email@esempio.it" error />
            </div>
            <div className="space-y-2">
              <label className="text-sm uppercase tracking-wide text-text-muted">
                Messaggio
              </label>
              <Textarea placeholder="Scrivi qui..." />
            </div>
            <Button variant="primary">
              Invia <ArrowRight size={18} />
            </Button>
          </div>
        </section>

        {/* CTA */}
        <section className="space-y-4">
          <SectionHeader eyebrow="Conversione" title="CTA Section" />
          <GlowPanel breathe className="flex flex-col items-center gap-4 text-center">
            <h3 className="text-display font-display font-bold uppercase">
              Pronto a iniziare?
            </h3>
            <Button variant="primary" size="lg">
              <Calendar size={18} /> Prenota una consulenza
            </Button>
          </GlowPanel>
        </section>
      </Container>
    </main>
  );
}
