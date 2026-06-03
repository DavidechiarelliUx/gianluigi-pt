import { motion } from "framer-motion";
import { Dumbbell, Target, HeartPulse } from "lucide-react";
import { SectionHeader } from "../ui/SectionHeader";

const PILLARS = [
  { icon: Target, title: "Metodo", text: "Programmazione basata su dati, non su sensazioni." },
  { icon: Dumbbell, title: "Disciplina", text: "Costanza guidata, obiettivi misurabili nel tempo." },
  { icon: HeartPulse, title: "Personalizzazione", text: "Ogni percorso è costruito sul tuo corpo e sulla tua vita." },
];

/** Sezione "Chi sono": autorevole ma umana, con visual geometrico in UI. */
export function About() {
  return (
    <div className="grid items-center gap-12 lg:grid-cols-2">
      {/* Visual costruito in UI (no stock): ritratto astratto a iniziali + glow */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative mx-auto w-full max-w-md"
      >
        <div className="relative aspect-square overflow-hidden rounded-xl border border-border bg-surface">
          {/* griglia neon di sfondo */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "linear-gradient(hsl(var(--accent)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent)) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          <div aria-hidden className="absolute -bottom-10 -right-10 h-48 w-48 rounded-full bg-accent/20 blur-[80px]" />
          {/* iniziali grandi */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-[7rem] font-extrabold uppercase leading-none text-accent drop-shadow-[0_0_24px_rgba(57,255,20,0.4)]">
              GC
            </span>
          </div>
          {/* etichetta */}
          <div className="absolute bottom-4 left-4 rounded-md border border-border bg-bg/80 px-3 py-2 backdrop-blur">
            <p className="text-sm font-semibold">Gianluigi Chiarelli</p>
            <p className="text-xs text-text-muted">Personal Trainer · Coach</p>
          </div>
        </div>
      </motion.div>

      {/* Testo */}
      <div className="space-y-6">
        <SectionHeader
          eyebrow="Chi sono"
          title="Allenare è una responsabilità"
        />
        <div className="space-y-4 text-text-muted">
          <p>
            Sono <span className="text-text">Gianluigi Chiarelli</span>, personal
            trainer e coach. Da oltre dieci anni accompagno persone reali verso
            trasformazioni reali — in studio e online.
          </p>
          <p>
            Non vendo scorciatoie: costruisco <span className="text-text">metodo</span>.
            Ogni programma nasce da una valutazione seria e si adatta nel tempo,
            perché il corpo cambia e l'allenamento deve cambiare con lui.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {PILLARS.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="rounded-lg border border-border bg-surface p-4"
              >
                <Icon className="mb-2 text-accent" size={22} />
                <h3 className="font-display text-sm font-bold uppercase">{p.title}</h3>
                <p className="mt-1 text-xs text-text-muted">{p.text}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
