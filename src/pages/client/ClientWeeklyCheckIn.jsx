import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, MessageCircle, Send } from "lucide-react";
import { apiFetch } from "../../lib/api";

function Rating({ label, value, onChange, low, high }) {
  return <fieldset className="client-checkin-rating">
    <legend>{label}</legend>
    <div>{[1, 2, 3, 4, 5].map((rating) => <button key={rating} type="button" aria-pressed={value === rating} className={value === rating ? "active" : ""} onClick={() => onChange(rating)}>{rating}</button>)}</div>
    <small><span>{low}</span><span>{high}</span></small>
  </fieldset>;
}

function CheckInForm({ current, onSubmit, busy, error }) {
  const [energy, setEnergy] = useState(current?.energy || 3);
  const [difficulty, setDifficulty] = useState(current?.difficulty || 3);
  const [obstacle, setObstacle] = useState(current?.obstacle || "");
  return <form className="client-checkin-form" onSubmit={(event) => { event.preventDefault(); onSubmit({ energy, difficulty, obstacle }); }}>
    <Rating label="Energia questa settimana" value={energy} onChange={setEnergy} low="Poca" high="Molta" />
    <Rating label="Difficoltà degli allenamenti" value={difficulty} onChange={setDifficulty} low="Leggeri" high="Molto duri" />
    <label>Che cosa ti ha ostacolato? <span>(facoltativo)</span><textarea rows={3} maxLength={500} value={obstacle} onChange={(event) => setObstacle(event.target.value)} placeholder="Tempo, recupero, esercizi difficili..." /></label>
    <p className="client-checkin-privacy">Gianluigi leggerà queste risposte per seguire il tuo percorso. <a href="/area-cliente/privacy">Privacy</a></p>
    {error && <p className="client-checkin-error" role="alert">Check-in non salvato. Riprova.</p>}
    <button type="submit" disabled={busy}><Send size={16} /> {busy ? "Invio..." : current ? "Aggiorna check-in" : "Invia check-in"}</button>
  </form>;
}

export default function ClientWeeklyCheckIn({ goal }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const checkInsQuery = useQuery({ queryKey: ["client", "check-ins"], queryFn: () => apiFetch("/api/client/check-ins") });
  const current = checkInsQuery.data?.current;
  const latestReply = checkInsQuery.data?.checkIns?.find((entry) => entry.reviewedAt && (entry.coachReply || entry.planNote));
  const save = useMutation({
    mutationFn: (payload) => apiFetch("/api/client/check-ins", { method: "POST", body: payload }),
    onSuccess: async () => { setOpen(false); await qc.invalidateQueries({ queryKey: ["client", "check-ins"] }); },
    onError: async (error) => {
      if (error.status === 409) {
        setOpen(false);
        await qc.invalidateQueries({ queryKey: ["client", "check-ins"] });
      }
    },
  });

  return <section className="client-checkin" aria-labelledby="client-checkin-title">
    <div className="client-checkin-heading"><div><span>IL TUO PERCORSO</span><h2 id="client-checkin-title">Come sta andando?</h2></div>{current && <CheckCircle2 size={21} aria-label="Check-in inviato" />}</div>
    {goal && <p className="client-checkin-goal"><strong>Il tuo obiettivo</strong>{goal}</p>}
    {checkInsQuery.isError ? <p className="client-checkin-muted">Non riesco a caricare il check-in. <button type="button" onClick={() => checkInsQuery.refetch()}>Riprova</button></p> : !checkInsQuery.isLoading && <>
      {current && <p className="client-checkin-current">Questa settimana: energia {current.energy}/5 · difficoltà {current.difficulty}/5{current.reviewedAt ? " · risposta del coach" : " · in attesa del coach"}</p>}
      {latestReply && <div className="client-checkin-reply"><MessageCircle size={18} /><div><strong>Gianluigi · {new Date(latestReply.weekStart).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}</strong>{latestReply.coachReply && <p>{latestReply.coachReply}</p>}{latestReply.planNote && <p><b>Per il tuo piano:</b> {latestReply.planNote}</p>}</div></div>}
      {!current?.reviewedAt && <><button type="button" className="client-checkin-open" aria-expanded={open} onClick={() => setOpen((value) => !value)}>{current ? "Modifica il check-in" : "Fai il check-in della settimana"}<ArrowRight size={17} /></button>{open && <CheckInForm key={current?.id || "new"} current={current} onSubmit={save.mutate} busy={save.isPending} error={save.isError} />}</>}
    </>}
  </section>;
}
