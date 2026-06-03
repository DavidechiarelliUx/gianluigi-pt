import { cn } from "../../lib/utils";

const variants = {
  primary:
    "bg-accent text-bg shadow-glow-soft hover:shadow-glow-neon hover:scale-[1.02]",
  secondary:
    "border border-accent text-text hover:bg-accent/10",
  ghost:
    "text-text-muted hover:bg-surface-2 hover:text-text",
  danger:
    "border border-danger text-danger hover:bg-danger/10",
};

const sizes = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-base",
  lg: "h-12 px-8 text-base",
};

/** Bottone — variant: primary|secondary|ghost|danger · size: sm|md|lg */
export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        "disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
