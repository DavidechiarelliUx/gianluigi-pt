import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";

const HIGHLIGHTS = ["Scheda personalizzata", "Live incluse o extra", "Supporto messaggi"];

/** Banner conversione home verso i pacchetti. */
export function LaunchBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="rounded-xl border border-accent/35 bg-accent/5 p-5 shadow-glow-soft sm:p-7"
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <Badge variant="neon">
            <Sparkles size={14} /> Percorsi online
          </Badge>
          <h2 className="mt-4 font-display text-3xl font-black uppercase leading-tight sm:text-4xl">
            Trova il pacchetto giusto per il tuo obiettivo
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted sm:text-base sm:leading-7">
            Scegli tra Start, Progress e Complete: tutti includono app, scheda personalizzata e supporto messaggi.
            Se vuoi più sessioni dal vivo, puoi aggiungere crediti live extra direttamente prima del pagamento.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <Button as="a" href="/pacchetti" className="w-full whitespace-nowrap sm:w-auto lg:w-full">
            Vai ai pacchetti <ArrowRight size={18} />
          </Button>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2 text-xs text-text-muted">
        {HIGHLIGHTS.map((item) => (
          <span key={item} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1">
            <CheckCircle2 size={13} className="text-accent" /> {item}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
