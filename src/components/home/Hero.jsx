import { motion, useReducedMotion } from "framer-motion";
import { Calendar, ArrowRight, Dumbbell, Activity, CreditCard, Video } from "lucide-react";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Container } from "../ui/Container";
import { AppPreview } from "./AppPreview";

const HEADLINE = ["TRASFORMA", "IL", "TUO", "FISICO"];
const STATS = [
  { value: "500+", label: "Clienti" },
  { value: "10", label: "Anni" },
  { value: "100%", label: "Su misura" },
];

/** Hero premium dark/neon con motion d'ingresso parola per parola. */
export function Hero() {
  const reduce = useReducedMotion();

  // Stagger disattivato se l'utente preferisce meno movimento
  const wordVariants = {
    hidden: { opacity: 0, y: reduce ? 0 : "0.4em" },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut", delay: reduce ? 0 : 0.15 + i * 0.08 },
    }),
  };

  return (
    <section
      id="hero"
      className="relative overflow-hidden pt-28 pb-16 sm:pt-32 sm:pb-section"
    >
      {/* Glow di sfondo controllato (non sotto il testo) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-0 h-96 w-96 rounded-full bg-accent/20 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-accent-2/10 blur-[120px]"
      />

      <Container className="relative grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Colonna testo */}
        <div className="space-y-7">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="neon">
              <Dumbbell size={14} /> Gianluigi Chiarelli — Personal Trainer
            </Badge>
          </motion.div>

          {/* Headline parola per parola */}
          <h1 className="text-hero font-display font-extrabold uppercase leading-[1.02]">
            {HEADLINE.map((word, i) => (
              <motion.span
                key={word + i}
                custom={i}
                variants={wordVariants}
                initial="hidden"
                animate="visible"
                className="mr-3 inline-block"
              >
                {word === "FISICO" ? (
                  <span className="text-accent drop-shadow-[0_0_18px_rgba(57,255,20,0.45)]">
                    {word}
                  </span>
                ) : (
                  word
                )}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: reduce ? 0 : 0.55 }}
            className="max-w-md text-lg text-text-muted"
          >
            Coaching online e in studio. Metodo, disciplina e risultati reali —
            programmi su misura per la tua trasformazione.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: reduce ? 0 : 0.7 }}
            className="flex flex-wrap gap-4"
          >
            <Button size="lg" onClick={() => (window.location.href = "/contatti")}>
              <Calendar size={18} /> Prenota consulenza
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => (window.location.href = "/pacchetti")}
            >
              Vedi i pacchetti <ArrowRight size={18} />
            </Button>
          </motion.div>

          {/* Statistiche */}
          <motion.dl
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: reduce ? 0 : 0.85 }}
            className="flex gap-8 border-t border-border pt-6"
          >
            {STATS.map((s) => (
              <div key={s.label}>
                <dd className="font-display text-3xl font-extrabold text-accent">
                  {s.value}
                </dd>
                <dt className="text-xs uppercase tracking-wide text-text-muted">
                  {s.label}
                </dt>
              </div>
            ))}
          </motion.dl>
        </div>

        {/* Colonna visual: super demo mobile dell'app reale */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: reduce ? 0 : 0.3 }}
          className="relative mx-auto flex w-full max-w-md justify-center pb-4 sm:pb-10"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-8 -z-10 rounded-full bg-accent/15 blur-[90px]"
          />

          <div className="relative rounded-[2rem] border border-accent/20 bg-surface/50 p-4 shadow-glow-soft backdrop-blur">
            <div className="absolute inset-x-10 -top-6 h-12 rounded-full bg-accent/25 blur-2xl" aria-hidden />
            <AppPreview />
          </div>

          {/* Badge fluttuanti */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: reduce ? 0 : 0.8 }}
            className="absolute -left-1 top-10 hidden rounded-md border border-border bg-surface/95 px-3 py-2 shadow-base backdrop-blur sm:block lg:-left-8"
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CreditCard size={16} className="text-accent" /> Pagamento ok
            </div>
            <p className="mt-1 text-[11px] text-text-muted">Accesso inviato via email</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: reduce ? 0 : 0.95 }}
            className="absolute -right-1 bottom-24 hidden rounded-md border border-accent/40 bg-surface/95 px-3 py-2 shadow-glow-soft backdrop-blur sm:block lg:-right-7"
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Video size={16} className="text-accent" /> Live prenotata
            </div>
            <p className="mt-1 text-[11px] text-text-muted">1:1 · gruppo · app</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: reduce ? 0 : 1.1 }}
            className="absolute -bottom-4 left-1/2 hidden w-[82%] -translate-x-1/2 rounded-md border border-border bg-bg/90 px-4 py-3 shadow-base backdrop-blur sm:block"
          >
            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="flex items-center gap-2 text-text-muted">
                <Activity size={15} className="text-accent" /> Progressi salvati
              </span>
              <span className="font-display font-bold text-accent">+18%</span>
            </div>
          </motion.div>
        </motion.div>
      </Container>
    </section>
  );
}
