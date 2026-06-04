import { AlertCircle, ChevronRight } from "lucide-react";
import { Skeleton } from "./Skeleton";
import { EmptyState } from "./EmptyState";
import { cn } from "../../lib/utils";

/**
 * Lista a card (mobile-first) — alternativa alla DataTable su schermi piccoli.
 * items: array di righe · renderItem(item) => contenuto card.
 * Stati: loading (Skeleton) · error · empty (EmptyState).
 */
export function DataList({
  items = [],
  renderItem,
  loading = false,
  error = null,
  onItemClick,
  empty,
  className,
}) {
  if (loading) return <Skeleton variant="card" count={4} />;

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-danger/50 bg-danger/10 px-4 py-3 text-sm text-danger">
        <AlertCircle size={16} /> {typeof error === "string" ? error : "Errore nel caricamento."}
      </div>
    );
  }

  if (!items.length) {
    return empty || <EmptyState title="Nessun elemento" description="Non c'è ancora nulla da mostrare." />;
  }

  return (
    <ul className={cn("space-y-3", className)}>
      {items.map((item, i) => (
        <li key={item.id ?? i}>
          <button
            type={onItemClick ? "button" : undefined}
            onClick={onItemClick ? () => onItemClick(item) : undefined}
            disabled={!onItemClick}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg border border-border bg-surface p-4 text-left transition-colors",
              onItemClick &&
                "hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            )}
          >
            <div className="min-w-0 flex-1">{renderItem(item)}</div>
            {onItemClick && <ChevronRight size={18} className="shrink-0 text-text-muted" />}
          </button>
        </li>
      ))}
    </ul>
  );
}
