import { Users } from "lucide-react";
import { EmptyState } from "../../components/app/EmptyState";

/** Gestione clienti — placeholder. CRUD + invito email in 2C-2. */
export default function Clients() {
  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl font-bold uppercase">Clienti</h2>
      <EmptyState
        icon={Users}
        title="Gestione clienti in arrivo"
        description="Qui potrai creare i clienti e inviare l'invito per impostare la password (Fase 2C-2)."
      />
    </div>
  );
}
