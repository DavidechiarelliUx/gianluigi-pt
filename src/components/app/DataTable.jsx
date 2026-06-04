import { AlertCircle } from "lucide-react";
import { Skeleton } from "./Skeleton";
import { EmptyState } from "./EmptyState";
import { cn } from "../../lib/utils";

/**
 * Tabella dati (desktop). columns: [{key, label, render?(row), className?}].
 * Stati: loading (Skeleton) · error · empty (EmptyState) · popolata.
 * onRowClick opzionale. Pensata per ≥sm; su mobile usare DataList.
 */
export function DataTable({
  columns = [],
  rows = [],
  loading = false,
  error = null,
  onRowClick,
  empty,
  className,
}) {
  if (loading) return <Skeleton variant="row" count={5} />;

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-danger/50 bg-danger/10 px-4 py-3 text-sm text-danger">
        <AlertCircle size={16} /> {typeof error === "string" ? error : "Errore nel caricamento."}
      </div>
    );
  }

  if (!rows.length) {
    return empty || <EmptyState title="Nessun dato" description="Non c'è ancora nulla da mostrare." />;
  }

  return (
    <div className={cn("overflow-x-auto rounded-lg border border-border", className)}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-surface text-left">
            {columns.map((c) => (
              <th
                key={c.key}
                className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.id ?? i}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "border-b border-border last:border-0 bg-surface/50 transition-colors",
                onRowClick && "cursor-pointer hover:bg-surface-2"
              )}
            >
              {columns.map((c) => (
                <td key={c.key} className={cn("px-4 py-3 text-text", c.className)}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
