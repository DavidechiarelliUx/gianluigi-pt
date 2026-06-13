import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Loader2, Mail, MessageCircle, Send } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { StatusBadge } from "../../components/app";
import { useAuth } from "../../hooks/useAuth";
import { apiFetch } from "../../lib/api";

const WHATSAPP = "https://wa.me/393000000000?text=Ciao%20Gianluigi%2C%20ti%20scrivo%20dall%27app.";

const SUBJECTS = ["Domanda sulla scheda", "Problema tecnico", "Modifica esercizi", "Abbonamento / pagamento", "Altro"];

const shortDate = (value) =>
  new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));

function ChatBubble({ item }) {
  const isAdmin = item.senderRole === "admin";
  return (
    <div className={`flex ${isAdmin ? "justify-start" : "justify-end"}`}>
      <div
        className="max-w-[86%] rounded-2xl border px-4 py-3"
        style={{
          background: isAdmin ? "#111" : "rgba(57,255,20,0.1)",
          borderColor: isAdmin ? "#1e1e1e" : "rgba(57,255,20,0.25)",
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
            {isAdmin ? "Gianluigi" : "Tu"} · {shortDate(item.createdAt)}
          </p>
          {!isAdmin && item.status === "resolved" && <StatusBadge status="success">Risolto</StatusBadge>}
          {!isAdmin && item.status !== "resolved" && <StatusBadge status="warning">Aperto</StatusBadge>}
        </div>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-text">{item.subject}</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-muted">{item.message}</p>
      </div>
    </div>
  );
}

export default function ClientContact() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();

  const [subject, setSubject] = useState("Domanda sulla scheda");
  const [message, setMessage] = useState("");

  const messagesQuery = useQuery({
    queryKey: ["client", "messages"],
    queryFn: () => apiFetch("/api/client/messages"),
  });

  const messages = useMemo(() => messagesQuery.data?.messages || [], [messagesQuery.data?.messages]);

  const sendMsg = useMutation({
    mutationFn: () =>
      apiFetch("/api/client/messages", {
        method: "POST",
        body: { subject: subject || "Messaggio dall'app", message },
      }),
    onSuccess: async () => {
      setMessage("");
      await qc.invalidateQueries({ queryKey: ["client", "messages"] });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMsg.mutate();
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 text-text-muted transition-colors hover:bg-surface-2 hover:text-text">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="font-display text-xl font-black uppercase leading-none">Chat con Gianluigi</h1>
          <p className="text-xs text-text-muted">Richieste, dubbi e risposte in un unico posto</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <a
          href={WHATSAPP}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors"
          style={{ background: "#111", borderColor: "#1e1e1e" }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "rgba(37,211,102,0.12)" }}>
            <MessageCircle size={20} style={{ color: "#25D366" }} />
          </div>
          <p className="text-sm font-semibold text-white">WhatsApp</p>
          <p className="text-[10px] text-text-muted">Per urgenze rapide</p>
        </a>

        <a
          href="mailto:gianluigi@gianluigipt.it"
          className="flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors"
          style={{ background: "#111", borderColor: "#1e1e1e" }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "rgba(57,255,20,0.1)" }}>
            <Mail size={20} className="text-accent" />
          </div>
          <p className="text-sm font-semibold text-white">Email</p>
          <p className="text-[10px] text-text-muted">Questioni dettagliate</p>
        </a>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="overflow-hidden rounded-2xl" style={{ background: "#0f0f0f", border: "1px solid #1e1e1e" }}>
          <div className="border-b px-4 py-3" style={{ borderColor: "#1e1e1e" }}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted">Messaggi in-app</p>
            <p className="text-xs text-text-muted">
              Da: <span className="font-semibold text-text">{user?.fullName || user?.email}</span>
            </p>
          </div>

          <div className="max-h-[420px] space-y-3 overflow-y-auto px-4 py-4">
            {messagesQuery.isLoading ? (
              <p className="text-sm text-text-muted">Caricamento messaggi...</p>
            ) : messages.length ? (
              messages.map((item) => <ChatBubble key={item.id} item={item} />)
            ) : (
              <div className="rounded-xl border p-4 text-sm text-text-muted" style={{ borderColor: "#1e1e1e", background: "#111" }}>
                Non hai ancora scritto messaggi. Quando invii una richiesta, la risposta del trainer comparirà qui.
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 border-t p-4" style={{ borderColor: "#1e1e1e" }}>
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">Argomento</p>
              <div className="flex flex-wrap gap-1.5">
                {SUBJECTS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSubject(s)}
                    className="rounded-full px-3 py-1 text-[11px] font-semibold transition-all"
                    style={{
                      background: subject === s ? "#39FF14" : "hsl(var(--surface-2))",
                      color: subject === s ? "#0a0a0a" : "hsl(var(--text-muted))",
                      border: subject === s ? "none" : "1px solid hsl(var(--border))",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {!SUBJECTS.includes(subject) && subject && (
                <Input className="mt-2" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Argomento personalizzato" />
              )}
            </div>

            <label className="block">
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">Il tuo messaggio</span>
              <Textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Scrivi la tua domanda, dubbio o richiesta..."
                required
              />
            </label>

            {sendMsg.isError && (
              <p className="rounded-lg p-3 text-sm" style={{ background: "rgba(255,59,59,0.1)", color: "#ff6b6b" }}>
                Errore nell'invio. Riprova o usa WhatsApp.
              </p>
            )}

            <Button type="submit" className="w-full" disabled={sendMsg.isPending || !message.trim()}>
              {sendMsg.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Invio...
                </>
              ) : (
                <>
                  <Send size={16} /> Invia messaggio
                </>
              )}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
