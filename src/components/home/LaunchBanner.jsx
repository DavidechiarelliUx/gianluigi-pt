import { useEffect, useState } from "react";
import { ArrowRight, Timer, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";

/** Banner conversione home → pacchetti, centrato su App Mensile. */
export function LaunchBanner() {
  const [appSeats, setAppSeats] = useState(12);

  useEffect(() => {
    let mounted = true;
    fetch("/api/payments/products")
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;
        const appMensile = data.products?.find((product) => product.name === "App Mensile");
        if (typeof appMensile?.remainingSeats === "number") setAppSeats(appMensile.remainingSeats);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

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
            <Timer size={14} /> Prezzo lancio piattaforma
          </Badge>
          <h2 className="mt-4 font-display text-3xl font-black uppercase leading-tight sm:text-4xl">
            App Mensile a <span className="text-accent">59€/mese</span>
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted sm:text-base sm:leading-7">
            Avrai una scheda mensile personalizzata, accesso all’app, tracking dei progressi e aggiornamenti manuali costanti.
            Per seguirti davvero e darti un supporto concreto, ho deciso di aprire solo 12 posti per questa fase di lancio.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <div className="rounded-md border border-border bg-bg/70 px-4 py-3 text-center">
            <p className="font-display text-3xl font-black text-accent">{appSeats}</p>
            <p className="text-xs uppercase tracking-wide text-text-muted">posti rimasti</p>
          </div>
          <Button as="a" href="/pacchetti" className="w-full whitespace-nowrap sm:w-auto lg:w-full">
            Blocca il prezzo <ArrowRight size={18} />
          </Button>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2 text-xs text-text-muted">
        <span className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1">
          <Zap size={13} className="text-accent" /> Prezzo standard 89€/mese
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1">
          Aggiornamento scheda incluso
        </span>
      </div>
    </motion.div>
  );
}
