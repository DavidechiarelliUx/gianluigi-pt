import { Dumbbell } from "lucide-react";
import { EmptyState } from "../../components/app/EmptyState";
import { useAuth } from "../../hooks/useAuth";

/** Home atleta — placeholder. Scheda attiva + tracking in Fase 2D. */
export default function MyWorkout() {
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold uppercase">
          Ciao, {user?.fullName?.split(" ")[0] || "Atleta"}
        </h1>
        <p className="text-sm text-text-muted">La tua area allenamenti.</p>
      </div>
      <EmptyState
        icon={Dumbbell}
        title="Allenamento in arrivo"
        description="Qui vedrai la tua scheda attiva e potrai tracciare gli esercizi (Fase 2D)."
      />
    </div>
  );
}
