import { CheckCircle2, Circle } from "lucide-react";

const EXERCISES = [
  { name: "Panca piana", detail: "4 × 8 · rec 90s", done: true },
  { name: "Spinte manubri", detail: "3 × 10 · rec 60s", done: true },
  { name: "Croci ai cavi", detail: "3 × 12 · rec 45s", done: false },
  { name: "French press", detail: "3 × 12 · rec 60s", done: false },
];

/**
 * Mockup grafico (no stock): cornice telefono con una scheda allenamento.
 * Puro UI — anticipa l'app della Fase 2.
 */
export function AppPreview() {
  return (
    <div className="rounded-[2rem] border border-border bg-surface p-3 shadow-base">
      <div className="overflow-hidden rounded-[1.5rem] border border-border bg-bg">
        {/* status bar finta */}
        <div className="flex items-center justify-between px-5 pt-4 text-[10px] text-text-muted">
          <span>9:41</span>
          <span className="h-1.5 w-16 rounded-full bg-border" />
        </div>

        {/* header app */}
        <div className="px-5 py-4">
          <p className="text-xs uppercase tracking-widest text-accent">Giorno A · Push</p>
          <h3 className="font-display text-xl font-bold uppercase">Allenamento</h3>
        </div>

        {/* lista esercizi */}
        <div className="space-y-2 px-5 pb-5">
          {EXERCISES.map((ex) => (
            <div
              key={ex.name}
              className={
                "flex items-center gap-3 rounded-md border bg-surface px-3 py-3 " +
                (ex.done ? "border-accent/40 shadow-glow-soft" : "border-border")
              }
            >
              {ex.done ? (
                <CheckCircle2 size={20} className="shrink-0 text-accent" />
              ) : (
                <Circle size={20} className="shrink-0 text-text-muted" />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{ex.name}</p>
                <p className="text-xs text-text-muted">{ex.detail}</p>
              </div>
            </div>
          ))}

          {/* progress */}
          <div className="pt-2">
            <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wide text-text-muted">
              <span>Completato</span>
              <span>50%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full w-1/2 rounded-full bg-neon-gradient" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
