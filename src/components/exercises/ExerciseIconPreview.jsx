import { ExerciseIllustration } from "./ExerciseIllustration";
import { EXERCISE_ILLUSTRATIONS } from "./exercise-data";

/**
 * Preview non montata nella homepage.
 * Utile da importare temporaneamente in una styleguide quando vuoi valutare la libreria.
 */
export function ExerciseIconPreview() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {EXERCISE_ILLUSTRATIONS.map((exercise) => (
        <article key={exercise.id} className="rounded-lg border border-border bg-surface p-4">
          <h3 className="font-display text-sm font-bold uppercase text-text">{exercise.label}</h3>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {exercise.phases.map((phase) => (
              <div key={phase}>
                <ExerciseIllustration
                  exercise={exercise.id}
                  phase={phase}
                  title={`${exercise.label} ${phase === "load" ? "carico" : phase === "unload" ? "scarico" : "statico"}`}
                  className="aspect-[4/3]"
                />
                <p className="mt-2 text-center text-[10px] uppercase tracking-wide text-text-muted">
                  {phase === "load" ? "Carico" : phase === "unload" ? "Scarico" : "Statico"}
                </p>
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
