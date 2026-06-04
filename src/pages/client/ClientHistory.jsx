import { useQuery } from "@tanstack/react-query";
import { CalendarCheck } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/app";
import { apiFetch } from "../../lib/api";

export default function ClientHistory() {
  const { data, isLoading } = useQuery({
    queryKey: ["client", "active-workout"],
    queryFn: () => apiFetch("/api/client/active-workout"),
  });
  const sessions = data?.sessions || [];

  if (isLoading) return <EmptyState icon={CalendarCheck} title="Carico lo storico" />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold uppercase">Storico</h1>
        <p className="text-sm text-text-muted">Le ultime sessioni salvate.</p>
      </div>
      {sessions.length ? (
        sessions.map((session) => (
          <Card key={session.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold uppercase">
                {new Date(session.date).toLocaleDateString("it-IT", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </h2>
              <span className="text-xs font-semibold text-accent">
                {session.itemLogs.filter((log) => log.completed).length}/{session.itemLogs.length}
              </span>
            </div>
            {session.feedbackNotes && <p className="text-sm text-text-muted">{session.feedbackNotes}</p>}
          </Card>
        ))
      ) : (
        <EmptyState icon={CalendarCheck} title="Nessuna sessione salvata" description="Completa il primo allenamento per vedere lo storico." />
      )}
    </div>
  );
}
