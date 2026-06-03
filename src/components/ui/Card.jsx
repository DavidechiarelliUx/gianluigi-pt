import { cn } from "../../lib/utils";

/** Card scura. hover=true accende bordo neon + glow al passaggio. */
export function Card({ hover = false, className, children, ...props }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface p-6 shadow-base",
        hover &&
          "transition-all hover:border-accent hover:shadow-glow-soft hover:-translate-y-1",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
