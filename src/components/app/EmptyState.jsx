import { Inbox } from "lucide-react";
import { cn } from "../../lib/utils";

/** Stato vuoto per liste/tabelle. icon opzionale (componente lucide), action opzionale (ReactNode). */
export function EmptyState({ icon: Icon = Inbox, title, description, action, className }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface/50 px-6 py-12 text-center",
        className
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface-2">
        <Icon size={26} className="text-text-muted" />
      </div>
      {title && <h3 className="font-display text-lg font-bold uppercase">{title}</h3>}
      {description && <p className="mt-1 max-w-sm text-sm text-text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
