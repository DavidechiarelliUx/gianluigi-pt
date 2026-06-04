import { CheckCircle2, Circle, PlayCircle } from "lucide-react";
import { Input } from "../ui/Input";
import { ExerciseIllustration } from "../exercises";
import { cn } from "../../lib/utils";

/**
 * Card esecuzione esercizio (area cliente, mobile-first).
 * exercise: { name, setsReps, rest?, videoUrl?, illustration? }
 * value: { completed, loadUsed, repsDone, rpe, notes }
 * onToggle(): segna completato · onChange(field, value): aggiorna i campi tracking.
 */
export function ExerciseCard({ exercise, value = {}, onToggle, onChange, className }) {
  const { completed, loadUsed = "", rpe = "", notes = "" } = value;
  const set = (field) => (e) => onChange?.(field, e.target.value);

  return (
    <div
      className={cn(
        "rounded-lg border bg-surface p-4 transition-colors",
        completed ? "border-accent/50 shadow-glow-soft" : "border-border",
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* Toggle completato — tap target ampio */}
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={!!completed}
          aria-label={completed ? "Segna come da fare" : "Segna come completato"}
          className="-m-2 shrink-0 rounded-full p-2 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-95"
        >
          {completed ? (
            <CheckCircle2 size={28} className="text-accent" />
          ) : (
            <Circle size={28} className="text-text-muted" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-base font-bold uppercase">{exercise.name}</h3>
            {exercise.videoUrl && (
              <a
                href={exercise.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                aria-label={`Guarda il video di ${exercise.name}`}
              >
                <PlayCircle size={16} /> Video
              </a>
            )}
          </div>
          <p className="mt-0.5 text-sm text-text-muted">
            {exercise.setsReps}
            {exercise.rest ? ` · rec ${exercise.rest}` : ""}
          </p>

          {exercise.illustration && (
            <div className="mt-3 grid grid-cols-2 gap-2" aria-label={`Illustrazione esercizio ${exercise.name}`}>
              <div>
                <ExerciseIllustration
                  exercise={exercise.illustration}
                  phase="load"
                  title={`${exercise.name} fase di carico`}
                  className="aspect-[4/3]"
                />
                <p className="mt-1 text-center text-[10px] uppercase tracking-wide text-text-muted">Carico</p>
              </div>
              <div>
                <ExerciseIllustration
                  exercise={exercise.illustration}
                  phase="unload"
                  title={`${exercise.name} fase di scarico`}
                  className="aspect-[4/3]"
                />
                <p className="mt-1 text-center text-[10px] uppercase tracking-wide text-text-muted">Scarico</p>
              </div>
            </div>
          )}

          {/* Tracking */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-wide text-text-muted">Carico</span>
              <Input
                inputMode="text"
                placeholder="es. 60kg"
                value={loadUsed}
                onChange={set("loadUsed")}
                className="h-10"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-wide text-text-muted">RPE 1-10</span>
              <Input
                inputMode="numeric"
                placeholder="es. 8"
                value={rpe}
                onChange={set("rpe")}
                className="h-10"
              />
            </label>
          </div>
          <label className="mt-2 block">
            <span className="mb-1 block text-[10px] uppercase tracking-wide text-text-muted">Note</span>
            <Input
              placeholder="(facoltative)"
              value={notes}
              onChange={set("notes")}
              className="h-10"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
