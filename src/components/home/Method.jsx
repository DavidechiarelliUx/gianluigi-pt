import { motion } from "framer-motion";
import { SectionHeader } from "../ui/SectionHeader";

const STEPS = [
  { n: "01", title: "Valutazione iniziale", text: "Anamnesi, obiettivi, livello di partenza e vincoli reali." },
  { n: "02", title: "Piano su misura", text: "Costruisco il programma giusto per te: esercizi, volumi, tempi." },
  { n: "03", title: "Allenamento progressivo", text: "Carichi e intensità crescono con metodo, senza bruciare le tappe." },
  { n: "04", title: "Monitoraggio", text: "Traccio progressi, feedback e dati per restare sulla rotta." },
  { n: "05", title: "Adattamento nel tempo", text: "Il piano evolve con il tuo corpo: nulla resta fermo." },
];

/** Sezione Metodo: timeline verticale con numeri neon. */
export function Method() {
  return (
    <>
      <SectionHeader
        eyebrow="Il metodo"
        title="Come lavoro"
        subtitle="Cinque passi, un percorso chiaro. Niente improvvisazione."
      />
      <ol className="mt-10 space-y-px overflow-hidden rounded-lg border border-border">
        {STEPS.map((s, i) => (
          <motion.li
            key={s.n}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="group flex items-center gap-5 bg-surface p-5 transition-colors hover:bg-surface-2 sm:gap-8 sm:p-6"
          >
            <span className="font-display text-4xl font-extrabold text-border transition-colors group-hover:text-accent sm:text-5xl">
              {s.n}
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-lg font-bold uppercase sm:text-xl">
                {s.title}
              </h3>
              <p className="mt-1 text-sm text-text-muted">{s.text}</p>
            </div>
          </motion.li>
        ))}
      </ol>
    </>
  );
}
