import { cn } from "../../lib/utils";

/** Input testuale. error=true mostra bordo danger. */
export function Input({ className, error = false, ...props }) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-sm border bg-surface-2 px-4 text-text placeholder:text-text-muted",
        "transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent",
        error ? "border-danger" : "border-border",
        className
      )}
      {...props}
    />
  );
}
