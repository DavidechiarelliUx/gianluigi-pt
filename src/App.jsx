import { motion } from "framer-motion";
import { Dumbbell, ArrowRight, Zap } from "lucide-react";
import { cn } from "./lib/utils";

/**
 * F1.1 — Pagina di verifica del design system dark/neon.
 * Temporanea: serve solo a validare token, colori, glow e motion.
 * Verrà sostituita dalle sezioni reali del sito nei task successivi (F1.4+).
 */
export default function App() {
  return (
    <main className="min-h-screen bg-bg text-text px-6 py-16">
      <div className="mx-auto max-w-4xl space-y-16">
        {/* Header animato */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="space-y-3"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 px-3 py-1 text-sm text-accent">
            <Dumbbell size={16} /> Gianluigi PT — Design System
          </span>
          <h1 className="text-hero font-display font-extrabold uppercase">
            Black <span className="text-accent">+</span> Neon
          </h1>
          <p className="text-text-muted">
            Verifica token, colori, glow e motion. F1.1 — base locale.
          </p>
        </motion.header>

        {/* Palette */}
        <section className="space-y-4">
          <h2 className="text-display font-display uppercase">Palette</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["bg", "bg-bg"],
              ["surface", "bg-surface"],
              ["surface-2", "bg-surface-2"],
              ["border", "bg-border"],
              ["accent", "bg-accent"],
              ["accent-2", "bg-accent-2"],
              ["text", "bg-text"],
              ["danger", "bg-danger"],
            ].map(([name, klass]) => (
              <div key={name} className="space-y-2">
                <div className={cn("h-16 rounded-lg border border-border", klass)} />
                <p className="text-xs text-text-muted">{name}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottoni */}
        <section className="space-y-4">
          <h2 className="text-display font-display uppercase">Bottoni</h2>
          <div className="flex flex-wrap gap-4">
            <button className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-semibold text-bg shadow-glow-soft transition hover:shadow-glow-neon hover:scale-[1.02]">
              Prenota <ArrowRight size={18} />
            </button>
            <button className="inline-flex items-center gap-2 rounded-full border border-accent px-6 py-3 font-semibold text-text transition hover:bg-accent/10">
              Scopri di più
            </button>
            <button className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold text-text-muted transition hover:bg-surface-2">
              Ghost
            </button>
          </div>
        </section>

        {/* Card + glow */}
        <section className="space-y-4">
          <h2 className="text-display font-display uppercase">Card &amp; Glow</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {["Forza", "Performance", "Disciplina"].map((t) => (
              <motion.div
                key={t}
                whileHover={{ y: -4 }}
                className="rounded-lg border border-border bg-surface p-6 shadow-base transition-colors hover:border-accent"
              >
                <Zap className="mb-3 text-accent" />
                <h3 className="font-display text-xl uppercase">{t}</h3>
                <p className="mt-1 text-sm text-text-muted">Card scura, bordo neon in hover.</p>
              </motion.div>
            ))}
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2 font-semibold text-bg animate-neon-breathe">
            CTA glow che respira
          </div>
        </section>
      </div>
    </main>
  );
}
