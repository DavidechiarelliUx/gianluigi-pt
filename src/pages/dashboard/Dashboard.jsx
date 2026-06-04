import { Users, ClipboardList, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui/Card";
import { useAuth } from "../../hooks/useAuth";
import { apiFetch } from "../../lib/api";

/** Panoramica admin (placeholder: stat reali in 2C-2/2D quando ci sono i dati). */
export default function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => apiFetch("/api/admin/summary"),
  });
  const summary = data?.summary;
  const stats = [
    { label: "Clienti", value: summary?.clients ?? "—", icon: Users },
    { label: "Schede attive", value: summary?.activeWorkouts ?? "—", icon: ClipboardList },
    { label: "Sessioni / sett.", value: summary?.sessionsWeek ?? "—", icon: Activity },
  ];
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold uppercase">
          Ciao, {user?.fullName?.split(" ")[0] || "Coach"} 👋
        </h2>
        <p className="text-sm text-text-muted">Benvenuto nella tua area di gestione.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <Icon className="mb-2 text-accent" size={22} />
              <div className="font-display text-3xl font-extrabold text-accent">
                {isLoading ? "…" : s.value}
              </div>
              <div className="text-xs uppercase tracking-wide text-text-muted">{s.label}</div>
            </Card>
          );
        })}
      </div>

      <p className="text-sm text-text-muted">
        Usa Clienti per creare l'atleta e Schede per assegnare il programma attivo.
      </p>
    </div>
  );
}
