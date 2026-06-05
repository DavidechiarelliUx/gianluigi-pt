import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import gianluigiPhoto from "../../assets/gianluigi-chiarelli.webp";

/** Teaser "Chi sono" per la home. Il racconto completo vive in /chi-sono. */
export function About() {
  return (
    <div className="grid items-center gap-8 lg:grid-cols-[0.78fr_1fr] lg:gap-12">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative mx-auto w-full max-w-[260px] lg:max-w-sm"
      >
        <div aria-hidden className="absolute -inset-6 -z-10 rounded-full bg-accent/10 blur-[70px]" />
        <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-border bg-surface">
          <img
            src={gianluigiPhoto}
            alt="Gianluigi Chiarelli, personal trainer"
            width={941}
            height={1672}
            loading="lazy"
            className="h-full w-full object-cover object-top"
          />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.08 }}
        className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left"
      >
        <Badge variant="neon">Chi sono</Badge>
        <h2 className="mt-5 font-display text-4xl font-black uppercase leading-tight sm:text-5xl">
          Metodo, tecnica e costanza
        </h2>
        <p className="mt-5 text-base leading-7 text-text-muted sm:text-lg sm:leading-8">
          Sono <span className="text-text">Gianluigi Chiarelli</span>. Aiuto persone reali ad allenarsi
          con un percorso chiaro: valutazione, programma su misura e progressi controllati nel tempo.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3 lg:justify-start">
          <Button onClick={() => (window.location.href = "/chi-sono")}>
            Leggi la storia <ArrowRight size={18} />
          </Button>
          <Button variant="secondary" onClick={() => (window.location.href = "/#contatti")}>
            Prenota una seduta
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
