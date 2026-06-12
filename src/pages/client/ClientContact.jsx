import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ChevronLeft, CheckCircle2, Loader2, Mail, MessageCircle, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Textarea } from "../../components/ui/Textarea";
import { useAuth } from "../../hooks/useAuth";
import { apiFetch } from "../../lib/api";

const WHATSAPP = "https://wa.me/393000000000?text=Ciao%20Gianluigi%2C%20ti%20scrivo%20dall%27app.";

const SUBJECTS = ["Domanda sulla scheda", "Problema tecnico", "Modifica esercizi", "Abbonamento / pagamento", "Altro"];

export default function ClientContact() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const sendMsg = useMutation({
    mutationFn: () =>
      apiFetch("/api/client/messages", {
        method: "POST",
        body: { subject: subject || "Messaggio dall'app", message },
      }),
    onSuccess: () => setSent(true),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMsg.mutate();
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="rounded-full p-1.5 text-text-muted transition-colors hover:bg-surface-2 hover:text-text">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="font-display text-xl font-black uppercase leading-none">Contatta Gianluigi</h1>
          <p className="text-xs text-text-muted">Scrivi direttamente a lui</p>
        </div>
      </div>

      {/* Quick contacts */}
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
          <p className="text-[10px] text-text-muted">Risposta rapida</p>
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

      {/* Message form */}
      <AnimatePresence mode="wait">
        {sent ? (
          <motion.div
            key="sent"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4 rounded-2xl p-8 text-center"
            style={{ background: "rgba(57,255,20,0.06)", border: "1px solid rgba(57,255,20,0.25)" }}
          >
            <CheckCircle2 size={40} className="text-accent" />
            <div>
              <p className="font-display text-lg font-bold uppercase">Messaggio inviato!</p>
              <p className="mt-1 text-sm text-text-muted">Gianluigi ti contatterà per email il prima possibile.</p>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                setSent(false);
                setMessage("");
                setSubject("");
              }}
            >
              Scrivi un altro messaggio
            </Button>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="rounded-2xl overflow-hidden" style={{ background: "#111", border: "1px solid #1e1e1e" }}>
              <div className="border-b px-4 py-3" style={{ borderColor: "#1e1e1e" }}>
                <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted">Messaggio in-app</p>
                <p className="text-xs text-text-muted">
                  Da: <span className="font-semibold text-text">{user?.fullName || user?.email}</span>
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 p-4">
                {/* Subject chips */}
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
                    placeholder="Scrivi la tua domanda, dubbio o richiesta…"
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
                      <Loader2 size={16} className="animate-spin" /> Invio…
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
        )}
      </AnimatePresence>
    </div>
  );
}
