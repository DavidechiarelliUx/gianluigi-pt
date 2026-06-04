import { EXERCISE_ILLUSTRATION_MAP } from "./exercise-data";
import { cn } from "../../lib/utils";

export function ExerciseIllustration({
  exercise = "push-up",
  className,
  title,
  showBackground = true,
}) {
  const item = EXERCISE_ILLUSTRATION_MAP.get(exercise) ?? EXERCISE_ILLUSTRATION_MAP.get("push-up");
  const label = title ?? item.label;

  return (
    <figure
      className={cn(
        "relative overflow-hidden rounded-lg border border-accent/20 bg-bg shadow-glow-soft",
        className
      )}
      aria-label={label}
    >
      {showBackground && (
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,hsl(var(--accent)/0.16),transparent_58%)]"
          aria-hidden="true"
        />
      )}
      <img
        src={item.image}
        alt={label}
        loading="lazy"
        decoding="async"
        className="relative z-10 h-full w-full object-contain p-2"
      />
    </figure>
  );
}
