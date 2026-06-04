import { Mail, Smartphone, User } from "lucide-react";
import { Button } from "../../components/ui/Button";
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

      <Card className="space-y-4 border-accent/25">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/10">
            <Smartphone className="text-accent" size={21} />
          </div>
          <div>
            <h2 className="font-display text-base font-bold uppercase">Usala come app</h2>
            <p className="mt-1 text-sm text-text-muted">
              Aggiungi l'area cliente alla schermata Home e aprila direttamente dal telefono.
            </p>
          </div>
        </div>
        <Button as="a" href="/installa-app" className="w-full">
          Istruzioni installazione
        </Button>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center gap-2 font-display text-sm font-bold uppercase">
          <Mail size={18} className="text-accent" /> Supporto
        </div>
        <p className="text-sm text-text-muted">
          Se qualcosa nella scheda non torna, scrivi a Gianluigi prima di modificare l'esercizio da solo.
        </p>
        <Button as="a" href="/#contatti" variant="secondary" className="w-full">
          Vai ai contatti
        </Button>
      </Card>
    </div>
  );
}
