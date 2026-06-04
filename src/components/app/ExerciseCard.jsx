import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Clock3, PlayCircle, RotateCcw } from "lucide-react";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
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
  const [remainingRest, setRemainingRest] = useState(0);
  const set = (field) => (e) => onChange?.(field, e.target.value);
  const restSeconds = Number(exercise.restSeconds || 0);
  const hasTimer = restSeconds > 0;

  useEffect(() => {
    if (!remainingRest) return undefined;
    const timer = window.setInterval(() => {
      setRemainingRest((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [remainingRest]);

  const minutes = Math.floor(remainingRest / 60);
  const seconds = String(remainingRest % 60).padStart(2, "0");

  return (
    <div
      className={cn(
        "rounded-lg border bg-surface p-4 transition-colors",
        completed ? "border-accent/50 shadow-glow-soft" : "border-border",
        className
      )}
    >
      {/* Header: solo cerchio + nome/serie sulla stessa riga */}
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
        </div>
      </div>

      {/* Illustrazione — a tutta larghezza, centrata nel riquadro */}
      {exercise.illustration && (
        <ExerciseIllustration
          exercise={exercise.illustration}
          title={`Illustrazione esercizio ${exercise.name}`}
          className="mx-auto mt-3 aspect-square w-full max-w-[260px]"
        />
      )}

      {/* Tracking — a tutta larghezza */}
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
      {hasTimer && (
        <div className="mt-3 rounded-md border border-border bg-bg/45 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              <Clock3 size={15} className="text-accent" /> Timer recupero
            </div>
            <span className="font-display text-lg font-bold text-accent">
              {remainingRest ? `${minutes}:${seconds}` : exercise.rest}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="flex-1"
              onClick={() => setRemainingRest(restSeconds)}
            >
              <Clock3 size={15} /> Avvia
            </Button>
            {remainingRest > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setRemainingRest(0)}>
                <RotateCcw size={15} />
              </Button>
            )}
          </div>
        </div>
      )}
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
  );
}
