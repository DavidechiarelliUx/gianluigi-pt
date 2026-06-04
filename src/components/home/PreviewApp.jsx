import { motion } from "framer-motion";
import { CalendarCheck, CheckCircle2, Activity, History, MessageSquare } from "lucide-react";
import { SectionHeader } from "../ui/SectionHeader";
import { Badge } from "../ui/Badge";
import { AppPreview } from "./AppPreview";

const FEATURES = [
  {
    icon: CheckCircle2,
    title: "Scheda del giorno",
    text: "Segui ogni esercizio, serie e recupero. La tua routine sempre a portata di mano.",
  },
  {
    icon: Activity,
    title: "Tracking in tempo reale",
    text: "Registra carico, ripetizioni e difficoltà percepita per ogni set.",
  },
  {
    icon: CalendarCheck,
    title: "Sessioni live 1:1 e di gruppo",
    text: "Prenota le sessioni con Gianluigi direttamente dall'app, con link video integrato.",
  },
  {
    icon: History,
    title: "Storico progressi",
    text: "Tutti i tuoi allenamenti salvati, consultabili in qualsiasi momento.",
  },
  {
    icon: MessageSquare,
    title: "Feedback diretto al coach",
    text: "A fine sessione lascia note: dolori, energia, dubbi. Gianluigi aggiusta il programma.",
  },
];

/** Anteprima App allenamenti — demo interattiva telefono + feature list. */
export function PreviewApp() {
  return (
    <>
      <SectionHeader
        eyebrow="App disponibile"
        title="La tua area allenamento"
        subtitle="Non solo schede PDF: un'app vera per allenarti seguito, da qualsiasi dispositivo."
      />
      <div className="mt-10 grid items-center gap-12 lg:grid-cols-2">
        {/* Demo telefono */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative mx-auto w-full max-w-xs"
        >
          {/* alone neon dietro */}
          <div
            aria-hidden
            className="absolute -inset-8 -z-10 rounded-full blur-[90px]"
            style={{ background: "radial-gradient(ellipse at center, rgba(57,255,20,0.12) 0%, transparent 70%)" }}
          />
          <AppPreview />
          {/* didascalia */}
          <p className="mt-4 text-center text-xs text-text-muted">
            Tocca le tab per esplorare · si aggiorna automaticamente
          </p>
        </motion.div>

        {/* Feature list */}
        <div className="space-y-4">
          <Badge variant="live">App attiva</Badge>
          <ul className="space-y-3">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.li
                  key={f.title}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.4, delay: i * 0.07 }}
                  className="flex gap-4 rounded-lg border border-border bg-surface p-4"
                >
                  <Icon className="mt-0.5 shrink-0 text-accent" size={22} />
                  <div>
                    <h3 className="font-display text-base font-bold uppercase">{f.title}</h3>
                    <p className="mt-1 text-sm text-text-muted">{f.text}</p>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        </div>
      </div>
    </>
  );
}
