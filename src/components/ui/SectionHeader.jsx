import { cn } from "../../lib/utils";

/**
 * Intestazione di sezione: eyebrow (piccola label neon) + titolo display.
 * align: left|center
 */
export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = "left",
  className,
}) {
  return (
    <div
      className={cn(
        "space-y-3",
        align === "center" && "text-center mx-auto max-w-2xl",
        className
      )}
    >
      {eyebrow && (
        <span className="text-sm font-semibold uppercase tracking-widest text-accent">
          {eyebrow}
        </span>
      )}
      <h2 className="text-display font-display font-bold uppercase">{title}</h2>
      {subtitle && <p className="text-text-muted">{subtitle}</p>}
    </div>
  );
}
