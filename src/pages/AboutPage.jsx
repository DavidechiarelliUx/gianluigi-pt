import { motion } from "framer-motion";
import { Dumbbell, HeartPulse, ShieldCheck, Target } from "lucide-react";
import { MainLayout, Section } from "../components/layout";
import { Container } from "../components/ui/Container";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import gianluigiPhoto from "../assets/gianluigi-chiarelli.webp";

const VALUES = [
  {
    icon: Target,
    title: "Metodo",
    text: "Ogni scelta ha una ragione: volume, intensità, recupero e progressione vengono costruiti sul tuo punto di partenza.",
  },
  {
    icon: Dumbbell,
    title: "Tecnica",
    text: "Prima viene l'esecuzione. Il carico aumenta solo quando il movimento è solido e sostenibile.",
  },
  {
    icon: ShieldCheck,
    title: "Costanza",
    text: "Il percorso deve essere ripetibile nella tua vita reale, non perfetto solo sulla carta.",
  },
  {
    icon: HeartPulse,
    title: "Su misura",
    text: "Allenamento, feedback e modifiche si adattano al corpo, al tempo disponibile e all'obiettivo.",
  },
];

const STEPS = [
  "Valutazione iniziale e obiettivo concreto",
  "Programma su misura con app personale",
  "Tracking allenamenti, carichi e feedback",
  "Adattamento periodico del percorso",
];

export default function AboutPage() {
  return (
    <MainLayout>
      <section className="pt-28 pb-14 sm:pt-32 sm:pb-20">
        <Container>
          <div className="grid items-center gap-9 lg:grid-cols-[0.85fr_1fr] lg:gap-12">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="relative order-2 mx-auto w-full max-w-[240px] sm:max-w-[300px] md:max-w-sm lg:order-1 lg:max-w-md"
            >
              <div aria-hidden className="absolute -inset-6 -z-10 rounded-full bg-accent/12 blur-[70px] lg:-inset-8 lg:blur-[90px]" />
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-border bg-surface">
                <img
                  src={gianluigiPhoto}
                  alt="Gianluigi Chiarelli, personal trainer"
                  width={941}
                  height={1672}
                  className="h-full w-full object-cover object-top"
                />
                <div aria-hidden className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-bg via-bg/55 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 rounded-lg border border-border bg-bg/80 p-3 backdrop-blur sm:bottom-5 sm:left-5 sm:right-5 sm:p-4">
                  <p className="font-display text-base font-bold uppercase sm:text-lg">Gianluigi Chiarelli</p>
                  <p className="text-sm text-text-muted">Personal Trainer · Coach online</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: "easeOut", delay: 0.08 }}
              className="order-1 text-center lg:order-2 lg:text-left"
            >
              <Badge variant="neon">Chi sono</Badge>
              <h1 className="mt-5 font-display text-4xl font-black uppercase leading-tight sm:text-5xl lg:text-6xl lg:leading-none">
                Allenare è una responsabilità
              </h1>
              <div className="mx-auto mt-5 max-w-2xl space-y-4 text-base leading-7 text-text-muted sm:text-lg sm:leading-8 lg:mx-0">
                <p>
                  Sono <span className="text-text">Gianluigi Chiarelli</span>, personal trainer e coach.
                  Seguo persone che vogliono trasformare il proprio fisico senza affidarsi a scorciatoie,
                  schede casuali o promesse vuote.
                </p>
                <p>
                  Il mio lavoro è costruire un percorso chiaro: capire da dove parti, scegliere cosa serve,
                  misurare quello che succede e adattare l'allenamento nel tempo.
                </p>
              </div>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Button className="w-full sm:w-auto" onClick={() => (window.location.href = "/contatti")}>Prenota consulenza</Button>
                <Button className="w-full sm:w-auto" variant="secondary" onClick={() => (window.location.href = "/app")}>
                  Scopri l'app
                </Button>
              </div>
            </motion.div>
          </div>
        </Container>
      </section>

      <Section surface>
        <SectionHeader
          eyebrow="Come lavoro"
          title="Un metodo semplice da seguire"
          subtitle="La differenza non è fare di più. È fare le cose giuste, nel momento giusto, con controllo."
          align="center"
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <Card key={step}>
              <div className="mb-5 font-display text-4xl font-black text-accent">
                {String(index + 1).padStart(2, "0")}
              </div>
              <p className="text-sm leading-6 text-text-muted">{step}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeader
          eyebrow="Valori"
          title="Cosa guida ogni percorso"
          align="center"
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {VALUES.map((value) => {
            const Icon = value.icon;
            return (
              <Card key={value.title}>
                <Icon className="mb-5 text-accent" size={30} />
                <h2 className="font-display text-xl font-bold uppercase">{value.title}</h2>
                <p className="mt-3 text-sm leading-6 text-text-muted">{value.text}</p>
              </Card>
            );
          })}
        </div>
      </Section>
    </MainLayout>
  );
}
