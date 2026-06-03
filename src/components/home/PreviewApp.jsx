import { motion } from "framer-motion";
import { CheckCircle2, Activity, History, MessageSquare } from "lucide-react";
import { SectionHeader } from "../ui/SectionHeader";
import { Badge } from "../ui/Badge";
import { AppPreview } from "./AppPreview";

const FEATURES = [
  { icon: CheckCircle2, title: "Scheda del giorno", text: "Apri l'allenamento e segui ogni esercizio, serie e recupero." },
  { icon: Activity, title: "Tracking esercizi", text: "Segna i completati, registra carico e difficoltà percepita." },
  { icon: MessageSquare, title: "Feedback allenamento", text: "Lascia note al coach a fine sessione." },
  { icon: History, title: "Storico progressi", text: "Tutti i tuoi allenamenti, sempre consultabili." },
];

/** Anteprima App allenamenti online (Fase 2). Mockup in UI a sinistra, feature a destra. */
export function PreviewApp() {
  return (
    <>
      <SectionHeader
        eyebrow="In arrivo · App allenamenti"
        title="La tua area allenamento"
        subtitle="Non solo schede: una vera app per allenarti seguito, ovunque tu sia."
      />
      <div className="mt-10 grid items-center gap-12 lg:grid-cols-2">
        {/* Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative mx-auto w-full max-w-xs"
        >
          <div aria-hidden className="absolute -inset-6 -z-10 rounded-full bg-accent/10 blur-[80px]" />
          <AppPreview />
        </motion.div>

        {/* Feature list */}
        <div className="space-y-4">
          <Badge variant="soon">Fase 2</Badge>
          <ul className="space-y-3">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.li
                  key={f.title}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
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
