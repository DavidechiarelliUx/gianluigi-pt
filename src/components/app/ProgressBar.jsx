import { cn } from "../../lib/utils";

/**
 * Barra di progresso (es. % esercizi completati). value 0-100.
 * Il riempimento usa il neon-gradient; la transizione rispetta prefers-reduced-motion
 * (gestita globalmente in index.css).
 */
export function ProgressBar({ value = 0, label, showValue = true, size = "md", className }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const heights = { sm: "h-1.5", md: "h-2.5", lg: "h-3.5" };
  return (
    <div className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-wide text-text-muted">
          {label && <span>{label}</span>}
          {showValue && <span className="text-accent">{v}%</span>}
        </div>
      )}
      <div
        className={cn("w-full overflow-hidden rounded-full bg-surface-2", heights[size])}
        role="progressbar"
        aria-valuenow={v}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || "Progresso"}
      >
        <div
          className="h-full rounded-full bg-neon-gradient transition-[width] duration-700 ease-out"
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}
