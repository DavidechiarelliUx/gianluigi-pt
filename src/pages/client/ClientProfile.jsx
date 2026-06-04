import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, MessageSquareText, Smartphone, User } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { ProgressBar, StatusBadge } from "../../components/app";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { apiFetch } from "../../lib/api";

const money = (cents = 0, currency = "eur") =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(cents / 100);

export default function ClientProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [messageForm, setMessageForm] = useState({ subject: "", message: "" });

  const overviewQuery = useQuery({
    queryKey: ["client", "overview"],
    queryFn: () => apiFetch("/api/client/overview"),
  });
  const messagesQuery = useQuery({
    queryKey: ["client", "messages"],
    queryFn: () => apiFetch("/api/client/messages"),
  });

  const activePackage = overviewQuery.data?.activePackage;
  const messages = messagesQuery.data?.messages || [];

  const sendMessage = useMutation({
    mutationFn: () => apiFetch("/api/client/messages", { method: "POST", body: messageForm }),
    onSuccess: async () => {
      setMessageForm({ subject: "", message: "" });
      await qc.invalidateQueries({ queryKey: ["client", "messages"] });
      toast({ type: "success", title: "Messaggio inviato" });
    },
    onError: (err) => toast({ type: "error", title: "Invio fallito", description: err.message }),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold uppercase">Profilo</h1>
        <p className="text-sm text-text-muted">Account, pacchetto e richieste al coach.</p>
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

      {activePackage && (
        <Card className="space-y-3 border-accent/25">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold uppercase">{activePackage.productName}</h2>
              <p className="text-sm text-text-muted">{money(activePackage.amountCents, activePackage.currency)}</p>
            </div>
            <StatusBadge status="success">Attivo</StatusBadge>
          </div>
          {activePackage.sessionsQty ? (
            <ProgressBar
              label={`${activePackage.remainingSessions} sessioni residue`}
              value={(activePackage.usedSessions / activePackage.sessionsQty) * 100}
            />
          ) : (
            <p className="text-sm text-text-muted">Accesso piattaforma attivo.</p>
          )}
        </Card>
      )}

      <Card className="space-y-4 border-accent/25">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/10">
            <MessageSquareText className="text-accent" size={21} />
          </div>
          <div>
            <h2 className="font-display text-base font-bold uppercase">Scrivi al coach</h2>
            <p className="mt-1 text-sm text-text-muted">
              Chiedi una modifica scheda, segnala un dolore o lascia un feedback.
            </p>
          </div>
        </div>
        <Input
          placeholder="Oggetto"
          value={messageForm.subject}
          onChange={(e) => setMessageForm({ ...messageForm, subject: e.target.value })}
        />
        <Textarea
          rows={4}
          placeholder="Scrivi il messaggio per Gianluigi..."
          value={messageForm.message}
          onChange={(e) => setMessageForm({ ...messageForm, message: e.target.value })}
        />
        <Button
          onClick={() => sendMessage.mutate()}
          disabled={sendMessage.isPending || !messageForm.subject.trim() || !messageForm.message.trim()}
          className="w-full"
        >
          Invia richiesta
        </Button>
      </Card>

      {messages.length > 0 && (
        <Card className="space-y-3">
          <h2 className="font-display text-base font-bold uppercase">Richieste inviate</h2>
          {messages.slice(0, 4).map((item) => (
            <div key={item.id} className="rounded-lg border border-border bg-surface-2 p-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display text-sm font-bold uppercase">{item.subject}</h3>
                <StatusBadge status={item.status === "open" ? "warning" : "success"}>{item.status}</StatusBadge>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-text-muted">{item.message}</p>
            </div>
          ))}
        </Card>
      )}

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
          <Mail size={18} className="text-accent" /> Supporto rapido
        </div>
        <p className="text-sm text-text-muted">
          Se devi parlare fuori dall'app, passa dai contatti del sito.
        </p>
        <Button as="a" href="/#contatti" variant="secondary" className="w-full">
          Vai ai contatti
        </Button>
      </Card>
    </div>
  );
}
