import { cn } from "../../lib/utils";

/**
 * Bottom tab bar per l'area cliente mobile. Fixed in basso, safe-area iOS.
 * tabs: [{label, icon, href}] · activeHref · onNavigate(href) · hidden.
 * Su desktop (lg) si nasconde a favore di un layout centrato/nav alternativa.
 */
export function BottomTabBar({ tabs = [], activeHref, onNavigate, hidden = false }) {
  if (hidden) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-bg/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = t.href === activeHref;
          return (
            <li key={t.href} className="flex-1">
              <button
                onClick={() => onNavigate?.(t.href)}
                className={cn(
                  "flex w-full flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors",
                  active ? "text-accent" : "text-text-muted hover:text-text"
                )}
                aria-current={active ? "page" : undefined}
              >
                {Icon && <Icon size={22} />}
                {t.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
