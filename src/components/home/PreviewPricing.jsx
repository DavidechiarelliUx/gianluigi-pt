import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { SectionHeader } from "../ui/SectionHeader";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

const PLANS = [
  {
    name: "Start",
    label: "Per iniziare bene",
    text: "Il percorso essenziale per avere metodo, scheda e continuità dentro l'app.",
    features: ["Scheda su misura", "App cliente", "Supporto messaggi"],
    featured: false,
  },
  {
    name: "Progress",
    label: "Il più equilibrato",
    text: "La scelta giusta se vuoi un controllo più vicino e una live inclusa nel percorso.",
    features: ["1 live inclusa", "Check-in settimanale", "Progressi monitorati"],
    featured: true,
  },
  {
    name: "Complete",
    label: "Più live, più tecnica",
    text: "Per chi vuole essere seguito più spesso, correggere la tecnica e spingere con costanza.",
    features: ["3 live incluse", "Revisione tecnica", "Strategia mensile"],
    featured: false,
  },
];

/** Pacchetti e pagamenti: ingresso alla pagina Checkout Stripe. */
export function PreviewPricing() {
  return (
    <>
      <SectionHeader
        eyebrow="Percorsi online"
        title="Scegli come vuoi essere seguito"
        subtitle="Tre livelli di supporto, tutti con app, scheda personalizzata e la possibilità di aggiungere live extra prima del checkout."
        align="center"
      />
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {PLANS.map((p, i) => (
          <motion.div
            key={p.name}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, delay: i * 0.1 }}
            className={
              "relative flex flex-col rounded-xl border p-6 " +
              (p.featured
                ? "border-accent/50 bg-surface shadow-glow-soft"
                : "border-border bg-surface")
            }
          >
            {p.featured && (
              <span className="absolute -top-3 left-6">
                <Badge variant="neon">Più scelto</Badge>
              </span>
            )}
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">{p.label}</p>
            <h3 className="font-display text-lg font-bold uppercase">{p.name}</h3>
            <p className="mt-3 min-h-[4.5rem] text-sm leading-6 text-text-muted">{p.text}</p>
            <ul className="mt-5 space-y-2">
              {p.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-text-muted">
                  <Check size={16} className="shrink-0 text-accent" /> {f}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <Button
                variant={p.featured ? "primary" : "secondary"}
                className="w-full"
                onClick={() => (window.location.href = "/pacchetti")}
              >
                Scopri i pacchetti <ArrowRight size={16} />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-text-muted">
        Confronti i percorsi, scegli quello più adatto e aggiungi eventuali crediti live extra nello stesso checkout.
      </p>
    </>
  );
}
