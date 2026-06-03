import { cn } from "../../lib/utils";

/** Textarea. error=true mostra bordo danger. */
export function Textarea({ className, error = false, rows = 4, ...props }) {
  return (
    <textarea
      rows={rows}
      className={cn(
        "w-full rounded-sm border bg-surface-2 px-4 py-3 text-text placeholder:text-text-muted",
        "transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent resize-y",
        error ? "border-danger" : "border-border",
        className
      )}
      {...props}
    />
  );
}
