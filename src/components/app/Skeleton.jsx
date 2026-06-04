import { cn } from "../../lib/utils";

/**
 * Placeholder di caricamento con shimmer (rispetta prefers-reduced-motion via CSS globale).
 * variant: line | card | row · count per ripetere.
 */
export function Skeleton({ variant = "line", count = 1, className }) {
  const base =
    "relative overflow-hidden rounded-md bg-surface-2 " +
    "after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer " +
    "after:bg-gradient-to-r after:from-transparent after:via-white/5 after:to-transparent";

  const variants = {
    line: "h-4 w-full",
    card: "h-32 w-full rounded-lg",
    row: "h-12 w-full",
  };

  return (
    <div className={cn("space-y-2", className)} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn(base, variants[variant])} />
      ))}
    </div>
  );
}
