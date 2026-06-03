import { motion } from "framer-motion";
import { Check, CreditCard } from "lucide-react";
import { SectionHeader } from "../ui/SectionHeader";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

const PLANS = [
  {
    name: "Sessione singola",
    price: "40€",
    unit: "/ seduta",
    features: ["Personal training 1:1", "Nessun vincolo", "Ideale per provare"],
    featured: false,
  },
  {
    name: "Pacchetto 10",
    price: "350€",
    unit: "/ 10 sedute",
    features: ["Risparmio sul singolo", "Programmazione continua", "Priorità di prenotazione"],
    featured: true,
  },
  {
    name: "Abbonamento",
    price: "—",
    unit: "mensile",
    features: ["Coaching online continuo", "Schede + sessioni live", "Disponibile in futuro"],
    featured: false,
  },
];

/** Anteprima Pagamenti e pacchetti (Fase 3). Pricing cards, non funzionanti. */
export function PreviewPricing() {
  return (
    <>
      <SectionHeader
        eyebrow="In arrivo · Pagamenti"
        title="Pacchetti e abbonamenti"
        subtitle="Paga una sessione, un pacchetto o abbonati. Online e sicuro."
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
            <h3 className="font-display text-lg font-bold uppercase">{p.name}</h3>
            <div className="mt-3 flex items-end gap-1">
              <span className="font-display text-4xl font-extrabold text-accent">{p.price}</span>
              <span className="mb-1 text-sm text-text-muted">{p.unit}</span>
            </div>
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
                disabled
              >
                <CreditCard size={16} /> Presto disponibile
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-text-muted">
        Pagamenti online con Stripe in arrivo. Per ora, contattami per prenotare.
      </p>
    </>
  );
}
