import { cn } from "../../lib/utils";

/**
 * Tabs accessibili (giorni scheda, sezioni). Desktop inline, mobile scroll orizzontale.
 * tabs: [{id, label}] · activeId · onChange(id)
 */
export function Tabs({ tabs = [], activeId, onChange, className }) {
  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={cn(
        "flex gap-1 overflow-x-auto border-b border-border",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      {tabs.map((t) => {
        const active = t.id === activeId;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(t.id)}
            className={cn(
              "relative shrink-0 whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              active ? "text-accent" : "text-text-muted hover:text-text"
            )}
          >
            {t.label}
            {active && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" aria-hidden />
            )}
          </button>
        );
      })}
    </div>
  );
}
