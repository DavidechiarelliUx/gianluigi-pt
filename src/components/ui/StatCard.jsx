import { cn } from "../../lib/utils";

/**
 * Statistica d'impatto: numero grande neon + label.
 * value es. "500+", label es. "Clienti seguiti".
 */
export function StatCard({ value, label, className, ...props }) {
  return (
    <div className={cn("text-center", className)} {...props}>
      <div className="font-display text-4xl font-extrabold text-accent sm:text-5xl">
        {value}
      </div>
      <div className="mt-1 text-sm uppercase tracking-wide text-text-muted">
        {label}
      </div>
    </div>
  );
}
