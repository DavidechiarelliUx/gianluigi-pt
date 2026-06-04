import { cn } from "../../lib/utils";

const STYLES = {
  active: "border-accent/40 text-accent bg-accent/10",
  success: "border-success/40 text-success bg-success/10",
  archived: "border-border text-text-muted bg-surface-2",
  neutral: "border-border text-text-muted bg-surface-2",
  warning: "border-warning/40 text-warning bg-warning/10",
  danger: "border-danger/40 text-danger bg-danger/10",
  info: "border-info/40 text-info bg-info/10",
};

/** Badge di stato (scheda, sessione, pagamento). status: active|success|archived|neutral|warning|danger|info */
export function StatusBadge({ status = "neutral", children, className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide",
        STYLES[status] || STYLES.neutral,
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  );
}
