import { motion } from "framer-motion";
import { Check, CreditCard } from "lucide-react";
import { SectionHeader } from "../ui/SectionHeader";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

const PLANS = [
  {
    name: "Sessioni 1:1",
    price: "45€",
    unit: "/ sessione",
    features: ["Scegli quante sessioni", "Pagamento aggiornato in automatico", "Accesso area cliente"],
    featured: false,
  },
  {
    name: "Abbonamento",
    price: "99€",
    unit: "/ mese",
    features: ["Scheda + monitoraggio", "Priorità live", "Percorso continuativo"],
    featured: true,
  },
  {
    name: "Live gruppo",
    price: "10€",
    unit: "/ live",
    features: ["Accesso singolo", "Allenamento live", "Ideale per provare"],
    featured: false,
  },
  {
    name: "Scheda",
    price: "29€",
    unit: "/ piano",
    features: ["Scheda personalizzata", "Accesso piattaforma", "Base per iniziare"],
    featured: false,
  },
];

/** Pacchetti e pagamenti: ingresso alla pagina Checkout Stripe. */
export function PreviewPricing() {
  return (
    <>
      <SectionHeader
        eyebrow="Pagamenti online"
        title="Pacchetti e abbonamenti"
        subtitle="Acquista una sessione o un pacchetto. Dopo il pagamento ricevi l'accesso alla tua area cliente."
        align="center"
      />
      <div className="mt-10 grid gap-4 md:grid-cols-4">
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
                onClick={() => (window.location.href = "/pacchetti")}
              >
                <CreditCard size={16} /> Vedi pacchetti
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-text-muted">
        Pagamento sicuro con Stripe. Le sessioni live sono riservate ai clienti con pacchetto attivo.
      </p>
    </>
  );
}
