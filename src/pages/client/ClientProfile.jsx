import { User } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { useAuth } from "../../hooks/useAuth";

export default function ClientProfile() {
  const { user } = useAuth();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold uppercase">Profilo</h1>
        <p className="text-sm text-text-muted">Dati base del tuo account.</p>
      </div>
      <Card className="space-y-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-accent/40 bg-accent/10">
          <User className="text-accent" size={24} />
        </div>
        <div>
          <div className="text-xs uppercase text-text-muted">Nome</div>
          <div className="font-semibold">{user?.fullName || "—"}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-text-muted">Email</div>
          <div className="font-semibold">{user?.email || "—"}</div>
        </div>
      </Card>
    </div>
  );
}
