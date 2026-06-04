import { AnimatePresence, motion } from "framer-motion";
import { Dumbbell, X } from "lucide-react";
import { cn } from "../../lib/utils";

/**
 * Sidebar dashboard admin. Desktop: fissa a sinistra. Mobile: drawer off-canvas.
 * items: [{label, icon, href, badge?}] · activeHref · onNavigate(href) · open/onClose (mobile) · footer
 */
function NavList({ items, activeHref, onNavigate, footer }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 px-5 font-display text-lg font-bold uppercase">
        <Dumbbell size={22} className="text-accent" />
        Gianluigi <span className="text-accent">PT</span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {items.map((it) => {
          const Icon = it.icon;
          const active = it.href === activeHref;
          return (
            <button
              key={it.href}
              onClick={() => onNavigate?.(it.href)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-accent/10 text-accent"
                  : "text-text-muted hover:bg-surface-2 hover:text-text"
              )}
            >
              {Icon && <Icon size={18} />}
              <span className="flex-1 text-left">{it.label}</span>
              {it.badge != null && (
                <span className="rounded-full bg-surface-2 px-2 text-xs text-text-muted">
                  {it.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      {footer && <div className="border-t border-border p-3">{footer}</div>}
    </div>
  );
}

export function Sidebar({ items = [], activeHref, onNavigate, footer, open = false, onClose }) {
  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-60 shrink-0 border-r border-border bg-surface lg:block">
        <NavList items={items} activeHref={activeHref} onNavigate={onNavigate} footer={footer} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[80] lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/70"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className="absolute inset-y-0 left-0 w-64 border-r border-border bg-surface"
            >
              <button
                onClick={onClose}
                className="absolute right-3 top-4 text-text-muted hover:text-text"
                aria-label="Chiudi menu"
              >
                <X size={20} />
              </button>
              <NavList
                items={items}
                activeHref={activeHref}
                onNavigate={(h) => {
                  onNavigate?.(h);
                  onClose?.();
                }}
                footer={footer}
              />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
