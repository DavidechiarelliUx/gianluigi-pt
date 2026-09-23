import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft, ArrowRight, Check, ChevronRight, Clock3, Flame,
  LockKeyhole, RotateCcw, SkipForward, Sparkles, Trophy, X, Zap,
} from "lucide-react";
import "./workout-preview.css";

const number = (value) => Number(String(value).replace(",", "."));
const nodeX = (index) => index % 2 === 0 ? 72 : 288;
const nodeY = (index) => 76 + index * 164;

function RouteLine({ count, reached }) {
  const height = count * 164;
  return (
    <svg className="route-line" viewBox={`0 0 360 ${height}`} preserveAspectRatio="none" aria-hidden="true">
      {Array.from({ length: count - 1 }, (_, index) => {
        const startX = nodeX(index);
        const endX = nodeX(index + 1);
        const startY = nodeY(index);
        const endY = nodeY(index + 1);
        const midY = (startY + endY) / 2;
        return (
          <path
            key={index}
            d={`M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`}
            className={index < reached ? "route-passed" : "route-ahead"}
          />
        );
      })}
    </svg>
  );
}

function PathNode({ exercise, index, status, onOpen, dayId }) {
  return (
    <div id={`trail-${dayId}-${index}`} className={`trail-node ${index % 2 ? "right" : "left"}`} style={{ top: nodeY(index) + "px" }}>
      <button
        type="button"
        className={`trail-node-button ${status}`}
        onClick={onOpen}
        disabled={status === "locked"}
        aria-label={`${exercise.name}, ${status === "done" ? "completato" : status === "skipped" ? "da riprendere" : status === "locked" ? "bloccato" : "disponibile"}`}
      >
        <img src={exercise.art} alt="" />
        <span className="trail-node-symbol">
          {status === "done" ? <Check size={17} strokeWidth={3} /> : status === "skipped" ? <RotateCcw size={16} /> : status === "locked" ? <LockKeyhole size={16} /> : <Zap size={17} fill="currentColor" />}
        </span>
      </button>
      <div className="trail-node-copy">
        <span className="trail-node-step">TAPPA {String(index + 1).padStart(2, "0")}</span>
        <strong>{exercise.name}</strong>
        <small>{exercise.sets} · {exercise.reps}</small>
        {status !== "locked" && <span className="trail-node-last">Ultima volta: {exercise.previous}</span>}
        <button type="button" onClick={onOpen} disabled={status === "locked"} className={`trail-node-cta ${status}`}>
          {status === "done" ? "Rivedi" : status === "skipped" ? "Riprendi" : status === "locked" ? "Bloccato" : "Inizia"}
          {status !== "locked" && <ChevronRight size={14} />}
        </button>
      </div>
    </div>
  );
}

function ExerciseSheet({ exercise, index, entry, onPatch, onSave, onClose, restLeft, setRestLeft }) {
  const totalSets = Math.max(1, parseInt(exercise.sets, 10) || 1);
  const loads = Array.from({ length: totalSets }, (_, i) => entry.loads?.[i] || "");
  const activeSet = Math.min(totalSets - 1, entry.activeSet || 0);
  const phase = entry.phase || (entry.status === "done" ? "edit" : "sets");
  const currentLoad = loads[activeSet];

  const setLoad = (value) => {
    const next = [...loads];
    next[activeSet] = value;
    onPatch({ loads: next });
  };
  const completeSet = () => {
    if (activeSet < totalSets - 1) {
      const next = [...loads];
      if (!next[activeSet + 1]) next[activeSet + 1] = currentLoad;
      onPatch({ loads: next, activeSet: activeSet + 1 });
      setRestLeft(parseInt(exercise.rest, 10) || 60);
    } else {
      const summaryLoad = loads.filter(Boolean).map((value) => `${value} kg`).join(" / ");
      onPatch({ phase: "summary", summaryLoad });
    }
  };

  return (
    <div className="workout-overlay">
      <button className="workout-backdrop" aria-label="Chiudi esercizio" onClick={onClose} />
      <section className="workout-sheet" role="dialog" aria-modal="true" aria-labelledby="workout-sheet-title">
        <div className="sheet-handle" />
        <button className="sheet-close" onClick={onClose} aria-label="Chiudi e torna al percorso"><X size={20} /></button>
        <div className="sheet-heading">
          <span className="sheet-step">TAPPA {String(index + 1).padStart(2, "0")}</span>
          <h2 id="workout-sheet-title">{exercise.name}</h2>
          <p>{exercise.sets} · {exercise.reps} · recupero {exercise.rest}</p>
        </div>
        <div className="sheet-previous">
          <span>ULTIMA SESSIONE</span>
          <strong>{exercise.previous} <small>· {exercise.lastReps || exercise.reps}</small></strong>
        </div>

        {phase === "sets" && (
          <>
            <div className="sheet-set-tabs" aria-label="Serie">
              {loads.map((_, setIndex) => (
                <button key={setIndex} className={setIndex === activeSet ? "active" : setIndex < activeSet ? "past" : ""} onClick={() => { onPatch({ activeSet: setIndex }); setRestLeft(0); }} aria-label={`Serie ${setIndex + 1}`}>
                  {setIndex < activeSet ? <Check size={16} /> : setIndex + 1}
                </button>
              ))}
            </div>
            <div className="sheet-set-heading"><span>SERIE {activeSet + 1} DI {totalSets}</span><strong>{exercise.reps}</strong></div>
            <label className="sheet-load-label">Peso usato
              <span className="sheet-load-control"><input inputMode="decimal" type="text" value={currentLoad} onChange={(event) => setLoad(event.target.value)} placeholder={exercise.previous.replace(/[^\d,.]/g, "")} /><span>kg</span></span>
            </label>
            {currentLoad && (!Number.isFinite(number(currentLoad)) || number(currentLoad) < 0) && <p className="sheet-error">Inserisci un peso valido.</p>}
            {restLeft > 0 ? (
              <div className="sheet-rest" role="status"><span><Clock3 size={17} /> Recupero <strong>{restLeft}s</strong></span><button onClick={() => setRestLeft(0)}>Salta recupero</button></div>
            ) : (
              <button className="sheet-primary" onClick={completeSet} disabled={Boolean(currentLoad) && (!Number.isFinite(number(currentLoad)) || number(currentLoad) < 0)}>
                <Check size={18} /> {activeSet === totalSets - 1 ? "Termina le serie" : "Completa serie"}
              </button>
            )}
            <div className="sheet-secondary-row">
              {activeSet > 0 && <button onClick={() => { onPatch({ activeSet: activeSet - 1 }); setRestLeft(0); }}><ArrowLeft size={15} /> Serie precedente</button>}
              {entry.status !== "done" && <button onClick={() => onSave("skipped")}><SkipForward size={15} /> Salta per ora</button>}
            </div>
          </>
        )}

        {(phase === "summary" || phase === "edit") && (
          <>
            <div className="sheet-summary-title"><Sparkles size={20} /><strong>{phase === "edit" ? "Modifica il risultato" : "Serie completate!"}</strong></div>
            <label className="sheet-field">Carichi registrati
              <input type="text" value={entry.summaryLoad || ""} onChange={(event) => onPatch({ summaryLoad: event.target.value })} placeholder="es. 52,5 kg / 55 kg" />
            </label>
            <div className="sheet-field"><span>Sforzo percepito</span><div className="sheet-rpe" role="group" aria-label="Sforzo percepito da 1 a 10">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => <button key={value} type="button" className={entry.rpe === value ? "active" : ""} onClick={() => onPatch({ rpe: value })}>{value}</button>)}
            </div></div>
            <label className="sheet-field">Note per Gianluigi
              <textarea rows="2" value={entry.notes || ""} onChange={(event) => onPatch({ notes: event.target.value })} placeholder="Come è andata?" />
            </label>
            <button className="sheet-primary" onClick={() => onSave("done")}><Check size={18} /> {phase === "edit" ? "Salva modifiche" : "Completa esercizio"}</button>
            <button className="sheet-return" onClick={() => onPatch({ phase: "sets" })}><ArrowLeft size={15} /> Torna alle serie</button>
          </>
        )}
      </section>
    </div>
  );
}

export default function WorkoutPreview({ days, dayId, setDayId, entries, setEntries, reachedByDay, setReachedByDay, stats }) {
  const [openId, setOpenId] = useState(null);
  const [restLeft, setRestLeft] = useState(0);
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const day = days.find((item) => item.id === dayId) || days[0];
  const doneCount = day.exercises.filter((item) => entries[item.id]?.status === "done").length;
  const skippedCount = day.exercises.filter((item) => entries[item.id]?.status === "skipped").length;
  const reachedFromEntries = day.exercises.reduce((max, exercise, index) => entries[exercise.id]?.status ? Math.max(max, Math.min(index + 1, day.exercises.length - 1)) : max, 0);
  const reached = Math.max(reachedByDay[day.id] || 0, reachedFromEntries);
  const exercise = day.exercises.find((item) => item.id === openId);
  const exerciseIndex = day.exercises.findIndex((item) => item.id === openId);

  useEffect(() => {
    if (restLeft <= 0) return;
    const timer = window.setTimeout(() => setRestLeft((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [restLeft]);

  useEffect(() => {
    if (!openId) return;
    const onKeyDown = (event) => { if (event.key === "Escape") { setOpenId(null); setRestLeft(0); } };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openId]);

  const patchEntry = (patch) => setEntries((current) => ({ ...current, [openId]: { ...current[openId], ...patch } }));
  const saveEntry = (status) => {
    const allDone = status === "done" && entries[openId]?.status !== "done" && day.exercises.every((item) => item.id === openId || entries[item.id]?.status === "done");
    setEntries((current) => ({ ...current, [openId]: { ...current[openId], status, phase: status === "done" ? "edit" : current[openId]?.phase || "sets" } }));
    setReachedByDay((current) => ({ ...current, [day.id]: Math.max(current[day.id] || 0, Math.min(exerciseIndex + 1, day.exercises.length - 1)) }));
    setOpenId(null);
    setRestLeft(0);
    if (allDone) setCelebrationOpen(true);
    let nextIndex = day.exercises.findIndex((item, index) => index > exerciseIndex && entries[item.id]?.status !== "done" && entries[item.id]?.status !== "skipped");
    if (nextIndex < 0) nextIndex = day.exercises.findIndex((item) => item.id !== openId && entries[item.id]?.status !== "done");
    if (!allDone && nextIndex >= 0) {
      window.setTimeout(() => document.getElementById(`trail-${day.id}-${nextIndex}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 180);
    }
  };

  return (
    <>
      <header className="mission-header"><div><p className="header-kicker">La tua missione</p><h1>Allenamento<span>.</span></h1></div><span className="mission-level"><Zap size={15} fill="currentColor" /> LIVELLO 4</span></header>
      <div className="mission-stats" aria-label="Stato del percorso">
        <div><Flame size={19} /><strong>{stats.streak}</strong><span>settimane di fila</span></div>
        <div><Zap size={19} /><strong>{stats.xp}</strong><span>XP guadagnati</span></div>
      </div>
      <div className="mission-days" role="tablist" aria-label="Giorno di allenamento">
        {days.map((item) => <button key={item.id} role="tab" aria-selected={day.id === item.id} className={day.id === item.id ? "active" : ""} onClick={() => { setDayId(item.id); setOpenId(null); setRestLeft(0); setCelebrationOpen(false); }}>{item.name}</button>)}
      </div>
      <section className="mission-summary"><div><span>IL PERCORSO DI OGGI</span><h2>{day.focus}</h2><p>{day.exercises.length} esercizi · {day.duration}</p></div><div className="mission-progress-ring" style={{ "--progress": `${doneCount / day.exercises.length * 100}%` }}><strong>{doneCount}<small>/{day.exercises.length}</small></strong></div></section>
      <div className="route-heading"><span><Zap size={15} /> GIORNO {day.id.toUpperCase()}</span><strong>{doneCount === day.exercises.length ? "Percorso completo" : skippedCount ? `${skippedCount} da riprendere` : "Prossima tappa"}</strong></div>
      <div className="trail-map" style={{ height: day.exercises.length * 164 + "px" }}>
        <RouteLine count={day.exercises.length} reached={reached} />
        {day.exercises.map((item, index) => {
          const status = entries[item.id]?.status === "done" ? "done" : entries[item.id]?.status === "skipped" ? "skipped" : index <= reached ? "active" : "locked";
          return <PathNode key={item.id} dayId={day.id} exercise={item} index={index} status={status} onOpen={() => { setOpenId(item.id); setRestLeft(0); }} />;
        })}
      </div>
      <div className={`trail-finish ${doneCount === day.exercises.length ? "complete" : ""}`}><Trophy size={21} /><span><strong>{doneCount === day.exercises.length ? "Percorso completato!" : skippedCount ? "Il traguardo ti aspetta" : "Traguardo"}</strong><small>{doneCount === day.exercises.length ? "Tutte le tappe conquistate." : skippedCount ? "Riprendi le tappe saltate quando vuoi." : "Completa tutte le tappe per arrivare qui."}</small></span>{doneCount === day.exercises.length && <Sparkles size={18} />}</div>
      {exercise && createPortal(
        <ExerciseSheet key={openId} exercise={exercise} index={exerciseIndex} entry={entries[openId] || {}} onPatch={patchEntry} onSave={saveEntry} onClose={() => { setOpenId(null); setRestLeft(0); }} restLeft={restLeft} setRestLeft={setRestLeft} />,
        document.querySelector(".client-device")
      )}
      {celebrationOpen && createPortal(
        <div className="quest-complete-overlay" role="dialog" aria-modal="true" aria-labelledby="quest-complete-title">
          <div className="quest-complete-panel">
            <span className="quest-complete-icon"><Trophy size={34} /></span>
            <p>MISSIONE COMPLETATA</p>
            <h2 id="quest-complete-title">Percorso conquistato!</h2>
            <div className="quest-complete-stats"><span><Check size={16} /> {day.exercises.length} tappe</span><span><Zap size={16} /> +100 XP</span></div>
            <button onClick={() => setCelebrationOpen(false)}>Rivedi il percorso <ArrowRight size={17} /></button>
          </div>
        </div>,
        document.querySelector(".client-device")
      )}
    </>
  );
}
