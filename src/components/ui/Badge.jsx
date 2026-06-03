import { cn } from "../../lib/utils";

const variants = {
  default: "border border-border text-text-muted",
  neon: "border border-accent/40 text-accent",
  soon: "bg-accent/10 text-accent border border-accent/30",
};

/** Badge — variant: default|neon|soon ("coming soon"). */
export function Badge({ variant = "default", className, children, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
