import { ExerciseIconPreview } from "../components/exercises";

/**
 * Styleguide interna (NON in produzione per i visitatori).
 * Visibile solo aprendo l'app con hash #styleguide (vedi main.jsx).
 * Serve a valutare le sagome esercizi prima di collegarle alla Fase 2.
 */
export default function Styleguide() {
  return (
    <main className="min-h-screen bg-bg px-6 py-12 text-text">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-2">
          <span className="text-sm font-semibold uppercase tracking-widest text-accent">
            Styleguide interna
          </span>
          <h1 className="text-display font-display font-extrabold uppercase">
            Sagome esercizi · neon
          </h1>
          <p className="text-text-muted">
            Libreria SVG originale (outline neon, viewBox 160×120). Fasi: carico / scarico / statico.
            Pagina di valutazione — non collegata al sito pubblico.
          </p>
        </header>

        <ExerciseIconPreview />

        <footer className="border-t border-border pt-6 text-xs text-text-muted">
          Per uscire dalla styleguide, rimuovi <code>#styleguide</code> dall'URL.
        </footer>
      </div>
    </main>
  );
}
