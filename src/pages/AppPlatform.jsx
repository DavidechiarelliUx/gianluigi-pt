import { motion } from "framer-motion";
import {
  Activity,
  CheckCircle2,
  Clock3,
  MessageSquareText,
  Smartphone,
  TrendingUp,
  Video,
} from "lucide-react";
import { MainLayout, Section } from "../components/layout";
import { Container } from "../components/ui/Container";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { AppPreview, PreviewLive } from "../components/home";

const FEATURES = [
  {
    icon: CheckCircle2,
    title: "Scheda del giorno",
    text: "Esercizi, serie, ripetizioni, recuperi e note sempre ordinati in app.",
  },
  {
    icon: Clock3,
    title: "Timer recupero",
    text: "Durante l'allenamento usi la modalità palestra e segui i recuperi senza distrazioni.",
  },
  {
    icon: Activity,
    title: "Tracking carichi",
    text: "Registra peso, RPE, note e completamento per ogni esercizio.",
  },
  {
    icon: TrendingUp,
    title: "Progressi",
    text: "Controlli storico, best load, misure e check-in fisici nel tempo.",
  },
  {
    icon: MessageSquareText,
    title: "Messaggi al coach",
    text: "Invii dubbi o richieste di modifica direttamente dall'area cliente.",
  },
  {
    icon: Video,
    title: "Live e prenotazioni",
    text: "Prenoti sessioni live, vedi countdown e accedi al link quando parte la sessione.",
  },
];

export default function AppPlatform() {
  return (
    <MainLayout>
      <section className="pt-32 pb-20">
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.8fr]">
            <div>
              <Badge variant="neon">App personale</Badge>
              <h1 className="mt-5 font-display text-5xl font-black uppercase leading-none sm:text-6xl">
                Un percorso guidato, pensato per te
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-text-muted">
                La piattaforma raccoglie scheda, tracking, progressi, live e feedback al coach
                in un unico posto. Il cliente la apre dal telefono e lavora sul programma del giorno.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button onClick={() => (window.location.href = "/pacchetti")}>
                  Vedi pacchetti
                </Button>
                <Button variant="secondary" onClick={() => (window.location.href = "/contatti")}>
                  Prenota consulenza
                </Button>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="relative mx-auto w-full max-w-xs"
            >
              <div
                aria-hidden
                className="absolute -inset-8 -z-10 rounded-full blur-[90px]"
                style={{ background: "radial-gradient(ellipse at center, rgba(57,255,20,0.15) 0%, transparent 70%)" }}
              />
              <AppPreview />
            </motion.div>
          </div>
        </Container>
      </section>

      <Section surface>
        <SectionHeader
          eyebrow="Cosa contiene"
          title="Una vera area cliente"
          subtitle="Non è un PDF: è un sistema operativo leggero per allenamento, controllo e feedback."
          align="center"
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Card className="h-full">
                  <Icon className="mb-5 text-accent" size={28} />
                  <h2 className="font-display text-lg font-bold uppercase">{feature.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-text-muted">{feature.text}</p>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </Section>

      <Section id="live">
        <PreviewLive />
      </Section>

      <Section surface>
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <Smartphone className="mx-auto text-accent" size={34} />
            <h2 className="mt-5 font-display text-3xl font-black uppercase sm:text-4xl">
              Funziona anche da telefono
            </h2>
            <p className="mt-4 text-text-muted">
              Il cliente può aggiungerla alla schermata Home e usarla quasi come un'app,
              senza passare da App Store.
            </p>
            <div className="mt-7 flex justify-center">
              <Button variant="secondary" onClick={() => (window.location.href = "/installa-app")}>
                Come installarla
              </Button>
            </div>
          </div>
        </Container>
      </Section>
    </MainLayout>
  );
}
