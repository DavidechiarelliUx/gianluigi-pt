import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Quote, ArrowRight, Calendar } from "lucide-react";
import { SectionHeader } from "../ui/SectionHeader";
import { Button } from "../ui/Button";

/* ---------- Mini casi studio: prima/dopo con dati, no foto ---------- */
const CASES = [
  {
    name: "Marco, 34",
    goal: "Ricomposizione",
    weeks: 16,
    metrics: [
      { label: "Massa grassa", from: 24, to: 16, unit: "%", down: true },
      { label: "Panca piana", from: 60, to: 85, unit: "kg", down: false },
    ],
  },
  {
    name: "Sara, 29",
    goal: "Dimagrimento",
    weeks: 20,
    metrics: [
      { label: "Peso", from: 78, to: 66, unit: "kg", down: true },
      { label: "Energia", from: 4, to: 9, unit: "/10", down: false },
    ],
  },
];

/** Barra prima/dopo astratta (no foto): mostra la variazione con dati. */
function MetricBar({ m }) {
  const max = Math.max(m.from, m.to);
  const toPct = (m.to / max) * 100;
  const Icon = m.down ? TrendingDown : TrendingUp;
  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-1 text-xs min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
        <span className="text-text-muted">{m.label}</span>
        <span className="flex items-center gap-1 font-semibold text-accent">
          <Icon size={13} />
          {m.from}
          {m.unit} → {m.to}
          {m.unit}
        </span>
      </div>

      <div className="relative h-2 overflow-hidden rounded-full bg-surface-2">
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, margin: "-40px", amount: 0.35 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="absolute inset-y-0 left-0 origin-left rounded-full bg-neon-gradient shadow-[0_0_14px_rgba(57,255,20,0.45)] will-change-transform"
          style={{ width: `${toPct}%` }}
        />
      </div>
    </div>
  );
}

function CaseCard({ c, delay }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, delay }}
      className="flex flex-col rounded-xl border border-border bg-surface p-6 transition-colors hover:border-accent"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-bold uppercase">{c.name}</h3>
          <p className="text-xs uppercase tracking-wide text-accent">{c.goal}</p>
        </div>
        <span className="rounded-full border border-border px-2.5 py-1 text-xs text-text-muted">
          {c.weeks} sett.
        </span>
      </div>
      <div className="mt-5 space-y-4">
        {c.metrics.map((m) => (
          <MetricBar key={m.label} m={m} />
        ))}
      </div>
    </motion.article>
  );
}

/* ---------- Testimonianze ---------- */
const TESTIMONIALS = [
  {
    text: "Mai stato seguito così. Ogni settimana sapevo esattamente cosa fare e perché. I risultati sono arrivati.",
    name: "Marco R.",
    role: "Cliente da 1 anno",
  },
  {
    text: "Pensavo di aver provato tutto. Il metodo di Gianluigi ha cambiato il mio rapporto con l'allenamento.",
    name: "Sara V.",
    role: "Coaching online",
  },
];

function TestimonialCard({ t, delay }) {
  return (
    <motion.figure
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, delay }}
      className="flex flex-col rounded-xl border border-border bg-surface p-6"
    >
      <Quote className="mb-3 text-accent" size={24} />
      <blockquote className="text-text">"{t.text}"</blockquote>
      <figcaption className="mt-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neon-gradient font-display text-sm font-bold text-bg">
          {t.name.charAt(0)}
        </span>
        <div>
          <p className="text-sm font-semibold">{t.name}</p>
          <p className="text-xs text-text-muted">{t.role}</p>
        </div>
      </figcaption>
    </motion.figure>
  );
}

/** Sezione Risultati: casi studio (prima/dopo a dati) + testimonianze + CTA. */
export function Results() {
  return (
    <>
      <SectionHeader
        eyebrow="Risultati"
        title="Trasformazioni reali"
        subtitle="Numeri, non promesse. Ecco cosa succede con metodo e costanza."
        align="center"
      />

      {/* Casi studio */}
      <div className="mx-auto mt-10 grid max-w-5xl gap-4 lg:grid-cols-2">
        {CASES.map((c, i) => (
          <CaseCard key={c.name} c={c} delay={i * 0.1} />
        ))}
      </div>

      {/* Testimonianze */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {TESTIMONIALS.map((t, i) => (
          <TestimonialCard key={t.name} t={t} delay={i * 0.1} />
        ))}
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5 }}
        className="mt-10 flex flex-col items-center gap-4 text-center"
      >
        <p className="max-w-md text-text-muted">
          Il prossimo risultato può essere il tuo. Partiamo da una consulenza.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button size="lg" onClick={() => (window.location.href = "/contatti")}>
            <Calendar size={18} /> Prenota consulenza
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => (window.location.hash = "#servizi")}
          >
            Vedi i servizi <ArrowRight size={18} />
          </Button>
        </div>
      </motion.div>
    </>
  );
}
