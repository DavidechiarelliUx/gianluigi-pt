import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Mail, MessageCircle, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { apiFetch } from "../../lib/api";
import coachPhoto from "../../assets/gianluigi-chiarelli.webp";

const subjects = ["Domanda sulla scheda", "Problema tecnico", "Modifica esercizi", "Abbonamento / pagamento", "Altro"];
const phone = String(import.meta.env.VITE_COACH_WHATSAPP || "").replace(/\D/g, "");
const whatsapp = phone && phone !== "393000000000" ? `https://wa.me/${phone}?text=${encodeURIComponent("Ciao Gianluigi, ti scrivo dall'app.")}` : null;
const shortDate = (value) => new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));

export default function ClientContactScreen() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [subject, setSubject] = useState(subjects[0]);
  const [message, setMessage] = useState("");
  const messagesQuery = useQuery({ queryKey: ["client", "messages"], queryFn: () => apiFetch("/api/client/messages") });
  const messages = useMemo(() => messagesQuery.data?.messages || [], [messagesQuery.data?.messages]);
  const send = useMutation({
    mutationFn: () => apiFetch("/api/client/messages", { method: "POST", body: { subject, message: message.trim() } }),
    onSuccess: async () => { setMessage(""); await qc.invalidateQueries({ queryKey: ["client", "messages"] }); },
  });
  const submit = (event) => { event.preventDefault(); if (message.trim().length >= 8) send.mutate(); };

  return <div className="client-contact"><header className="client-screen-header client-screen-back"><button className="client-icon-button" onClick={() => navigate("/area-cliente/profilo")} aria-label="Indietro"><ArrowLeft size={20} /></button><div><p>Il tuo coach</p><h1>Contatta Gianluigi</h1></div><img src={coachPhoto} alt="Gianluigi Chiarelli" /></header><p className="client-contact-status"><span /> Gianluigi Chiarelli · Personal trainer</p><div className="client-contact-messages">{messagesQuery.isLoading ? <p>Caricamento messaggi...</p> : messagesQuery.isError ? <p>Messaggi non disponibili. Riprova più tardi o usa l'email.</p> : messages.length ? messages.map((item) => { const coach = item.senderRole === "admin"; return <div key={item.id} className={"client-message " + (coach ? "coach" : "mine")}>{coach && <img src={coachPhoto} alt="" />}<div><small>{coach ? "Gianluigi" : user?.fullName || "Tu"} · {shortDate(item.createdAt)}{!coach && ` · ${item.status === "resolved" ? "Risolto" : "Aperto"}`}</small><strong>{item.subject}</strong><p>{item.message}</p></div></div>; }) : <p>Non hai ancora scritto messaggi. La risposta del trainer comparirà qui.</p>}</div><form className="client-contact-form" onSubmit={submit}><label>Argomento<select value={subject} onChange={(event) => setSubject(event.target.value)}>{subjects.map((item) => <option key={item}>{item}</option>)}</select></label><label>Il tuo messaggio<textarea rows={4} minLength={8} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Scrivi la tua domanda, dubbio o richiesta..." required /></label>{send.isError && <p className="client-contact-error" role="alert">Errore nell'invio. Riprova o usa l'email.</p>}<button type="submit" disabled={send.isPending || message.trim().length < 8}><Send size={17} /> {send.isPending ? "Invio..." : "Invia messaggio"}</button></form><div className="client-contact-channels">{whatsapp ? <a href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} /> WhatsApp</a> : <span title="Numero WhatsApp non configurato"><MessageCircle size={18} /> WhatsApp</span>}<a href="mailto:gianluigi@gianluigipt.it"><Mail size={18} /> Email</a></div></div>;
}
