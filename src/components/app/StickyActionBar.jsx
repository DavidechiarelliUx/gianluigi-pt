import { cn } from "../../lib/utils";

/**
 * Barra azioni fissa in basso (es. "Termina e salva", "Salva scheda").
 * Mobile: fixed bottom con safe-area. Desktop: ancorata in fondo al contenuto.
 * Passa i bottoni come children.
 */
export function StickyActionBar({ children, className }) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-30 border-t border-border bg-bg/90 px-4 py-3 backdrop-blur-md",
        className
      )}
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-3xl items-center justify-end gap-3">{children}</div>
    </div>
  );
}
