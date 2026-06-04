import { ExerciseIllustration } from "./ExerciseIllustration";
import { EXERCISE_ILLUSTRATIONS } from "./exercise-data";

/**
 * Preview interna, non montata nella homepage.
 * Mostra la libreria completa delle 25 immagini esercizio neon.
 */
export function ExerciseIconPreview() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {EXERCISE_ILLUSTRATIONS.map((exercise, index) => (
        <article key={exercise.id} className="rounded-lg border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-display text-sm font-bold uppercase text-text">{exercise.label}</h3>
            <span className="font-display text-xs font-bold text-accent">{String(index + 1).padStart(2, "0")}</span>
          </div>
          <ExerciseIllustration
            exercise={exercise.id}
            title={exercise.label}
            className="aspect-square"
          />
        </article>
      ))}
    </div>
  );
}
