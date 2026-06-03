import { cn } from "../../lib/utils";

/**
 * Pannello premium con glow neon costante e bordo accentato.
 * breathe=true attiva il glow "che respira".
 */
export function GlowPanel({ breathe = false, className, children, ...props }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-accent/40 bg-surface p-8",
        breathe ? "animate-neon-breathe" : "shadow-glow-neon",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
