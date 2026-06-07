import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Dumbbell,
  History,
  User,
  Video,
  X,
} from "lucide-react";

// ─── Dati mock ────────────────────────────────────────────────────────────────

const PATH_NODES = [
  { id: 1, name: "Curl bicipiti", detail: "3 × 8-10 · rec 90s", tag: "Bicipiti", x: 26, y: 25, state: "done" },
  { id: 2, name: "Curl con bilanciere", detail: "3 × 8-10 · rec 90s", tag: "Bicipiti", x: 67, y: 42, state: "active" },
  { id: 3, name: "Hammer curl", detail: "3 × 8-10 · rec 90s", tag: "Bicipiti", x: 31, y: 63, state: "locked" },
];

const LIVE_SESSIONS = [
  {
    id: 1,
    title: "Allenamento 1:1",
    type: "1:1",
    date: "Dom 8 giu · 10:00",
    dur: "60 min",
    booked: true,
  },
  {
    id: 2,
    title: "Circuit Training",
    type: "Gruppo",
    date: "Mar 10 giu · 18:30",
    dur: "45 min",
    slots: "3/8",
    booked: false,
  },
];

const HISTORY = [
  { id: 1, date: "4 giu 2026", day: "Giorno A · Gambe", done: 4, total: 4, rpe: 8 },
  { id: 2, date: "2 giu 2026", day: "Giorno B · Upper", done: 5, total: 6, rpe: 7 },
  { id: 3, date: "31 mag 2026", day: "Giorno A · Gambe", done: 4, total: 4, rpe: 9 },
];

const SCREENS = ["path", "live", "storico"];

// ─── Schermate ────────────────────────────────────────────────────────────────

function PathNode({ node }) {
  const isDone = node.state === "done";
  const isActive = node.state === "active";
  const isLocked = node.state === "locked";

  return (
    <div
      className="absolute flex items-center gap-2.5"
      style={{
        left: `${node.x}%`,
        top: `${node.y}%`,
        opacity: isLocked ? 0.22 : 1,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
        style={{
          background: isDone ? "#178f0d" : "#070707",
          border: isActive ? "2px solid #39FF14" : "1.5px solid rgba(57,255,20,0.45)",
          boxShadow: isDone || isActive ? "0 0 22px rgba(57,255,20,0.5)" : "none",
        }}
      >
        {isDone ? (
          <CheckCircle2 size={19} className="text-black" />
        ) : isLocked ? (
          <Dumbbell size={17} style={{ color: "#222" }} />
        ) : (
          <Dumbbell size={18} style={{ color: "#39FF14" }} />
        )}
      </div>
      {isActive && (
        <div className="w-[86px]">
          <p className="font-display text-[8px] font-black uppercase leading-tight" style={{ color: "#39FF14" }}>
            {node.name}
          </p>
          <p className="mt-0.5 text-[6px]" style={{ color: "#575757" }}>{node.detail}</p>
          <span className="mt-1 inline-flex rounded-full px-2 py-0.5 text-[5.5px] font-black uppercase" style={{ background: "rgba(57,255,20,0.08)", color: "#39FF14" }}>
            {node.tag}
          </span>
        </div>
      )}
    </div>
  );
}

function ScreenWorkoutPath() {
  return (
    <div className="relative h-full overflow-hidden">
      <div className="px-4 pb-2 pt-3">
        <div className="mb-2 flex rounded-full border border-border/80 bg-black/60 p-0.5">
          <span className="flex-1 rounded-full py-1 text-center text-[7px] font-black uppercase" style={{ background: "#39FF14", color: "#050505" }}>
            Percorso
          </span>
          <span className="flex-1 py-1 text-center text-[7px] font-black uppercase text-text-muted">Lista</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-[11px] font-black uppercase text-white">Upper focus</p>
            <p className="text-[7px] uppercase tracking-wide text-text-muted">Giorno B · 20%</p>
          </div>
          <span className="font-display text-[11px] font-black" style={{ color: "#39FF14" }}>20%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border/70">
          <div className="h-full w-1/5 rounded-full" style={{ background: "#178f0d", boxShadow: "0 0 10px rgba(57,255,20,0.45)" }} />
        </div>
      </div>

      <div
        aria-hidden
        className="absolute inset-x-0 top-16 h-[250px]"
        style={{
          background:
            "radial-gradient(circle at 28% 20%, rgba(57,255,20,0.18), transparent 18%), radial-gradient(circle at 78% 38%, rgba(57,255,20,0.16), transparent 18%), linear-gradient(180deg, transparent, rgba(0,0,0,0.55))",
        }}
      />

      <svg aria-hidden className="absolute inset-x-0 top-[105px] h-[170px] w-full opacity-70" viewBox="0 0 224 170">
        <path d="M64 28 C92 46, 128 56, 162 71" stroke="rgba(57,255,20,0.32)" strokeWidth="2" fill="none" />
        <path d="M162 88 C127 105, 93 123, 63 142" stroke="rgba(57,255,20,0.08)" strokeWidth="2" strokeDasharray="5 6" fill="none" />
      </svg>

      {PATH_NODES.map((node) => <PathNode key={node.id} node={node} />)}

      <div
        className="absolute inset-x-0 bottom-0 h-[235px] overflow-hidden rounded-t-[24px] px-4 pb-3 pt-2.5"
        style={{
          background: "linear-gradient(180deg, #121212 0%, #090909 100%)",
          borderTop: "1px solid #1f1f1f",
          boxShadow: "0 -20px 45px rgba(0,0,0,0.72)",
        }}
      >
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-full px-2 py-0.5 text-[7px] font-black uppercase" style={{ background: "rgba(57,255,20,0.12)", color: "#39FF14" }}>
            Bicipiti
          </span>
          <X size={14} className="text-text-muted" />
        </div>
        <h3 className="mt-1.5 font-display text-[14px] font-black uppercase leading-none text-white">
          Curl con bilanciere
        </h3>
        <p className="mt-1 text-[8.5px] text-text-muted">3 serie × 8-10 rip · rec 90s</p>

        <div className="mt-2.5 flex items-center gap-2">
          {[1, 2].map((n) => (
            <span key={n} className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: "#39FF14" }}>
              <CheckCircle2 size={12} className="text-black" />
            </span>
          ))}
          <span className="flex h-6 w-6 items-center justify-center rounded-full border text-[9px] font-black" style={{ borderColor: "#39FF14", color: "#39FF14" }}>
            3
          </span>
        </div>

        <p className="mt-2 text-[6.5px] font-black uppercase tracking-wider" style={{ color: "#39FF14" }}>Serie 3 di 3</p>
        <p className="font-display text-[13px] font-black text-white">8-10 ripetizioni</p>

        <div className="mt-2 rounded-xl border border-border bg-black/30 px-3 py-2">
          <div className="mb-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[7px] font-bold text-text-muted">
              <Clock3 size={10} /> Recupero tra serie
            </div>
            <span className="text-[10px] font-black" style={{ color: "#39FF14" }}>90s</span>
          </div>
          <div className="relative h-1.5 rounded-full bg-border">
            <div className="absolute inset-y-0 left-0 w-[82%] rounded-full" style={{ background: "#39FF14", boxShadow: "0 0 8px rgba(57,255,20,0.55)" }} />
            <span className="absolute -top-1.5 left-[82%] h-4 w-4 rounded-full border-2 border-text-muted bg-black" />
          </div>
          <p className="mt-1 text-[6.5px] text-text-muted">Salta recupero</p>
        </div>

        <div className="mt-2">
          <p className="mb-1 text-[7px] font-black uppercase tracking-wider text-text-muted">Carico · serie 3</p>
          <div className="rounded-lg border border-border bg-surface px-3 py-1.5 text-[9px] text-text-muted">
            es. 60kg · elastico · corpo libero
          </div>
        </div>
      </div>
    </div>
  );
}

function ScreenLive() {
  return (
    <div className="flex h-full flex-col px-4 pt-3">
      <p className="font-display text-sm font-bold uppercase text-white">Sessioni Live</p>
      <p className="mb-3 text-[9px]" style={{ color: "#777" }}>Prenota con Gianluigi</p>
      <div className="space-y-2">
        {LIVE_SESSIONS.map((s) => (
          <div
            key={s.id}
            className="rounded-lg px-3 py-2.5"
            style={{
              background: s.booked ? "rgba(57,255,20,0.06)" : "#141414",
              border: `1px solid ${s.booked ? "rgba(57,255,20,0.3)" : "#222"}`,
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-[11px] font-bold text-white">{s.title}</p>
                  <span
                    className="rounded-full px-1.5 py-px text-[8px] font-semibold uppercase"
                    style={{
                      background: s.type === "1:1" ? "rgba(57,255,20,0.15)" : "rgba(255,165,0,0.15)",
                      color: s.type === "1:1" ? "#39FF14" : "#ffa500",
                    }}
                  >
                    {s.type}
                  </span>
                </div>
                <p className="mt-0.5 text-[9px]" style={{ color: "#777" }}>
                  {s.date} · {s.dur}
                  {s.slots && <span style={{ color: "#aaa" }}> · {s.slots} posti</span>}
                </p>
              </div>
              {s.booked ? (
                <span
                  className="shrink-0 rounded-full px-2 py-px text-[8px] font-bold uppercase"
                  style={{ background: "#39FF14", color: "#0a0a0a" }}
                >
                  Prenotata
                </span>
              ) : (
                <span
                  className="shrink-0 rounded-full border px-2 py-px text-[8px] font-bold uppercase"
                  style={{ borderColor: "#39FF14", color: "#39FF14" }}
                >
                  Prenota
                </span>
              )}
            </div>
            {s.booked && (
              <div
                className="mt-2 flex items-center gap-1.5 rounded-md px-2 py-1.5"
                style={{ background: "rgba(57,255,20,0.07)" }}
              >
                <Video size={10} style={{ color: "#39FF14" }} />
                <p className="text-[9px]" style={{ color: "#39FF14" }}>
                  Link disponibile il giorno della sessione
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ScreenStorico() {
  return (
    <div className="flex h-full flex-col px-4 pt-3">
      <p className="font-display text-sm font-bold uppercase text-white">Storico</p>
      <p className="mb-3 text-[9px]" style={{ color: "#777" }}>Le ultime sessioni salvate</p>
      <div className="space-y-2">
        {HISTORY.map((s) => {
          const pct = Math.round((s.done / s.total) * 100);
          return (
            <div
              key={s.id}
              className="rounded-lg px-3 py-2.5"
              style={{ background: "#141414", border: "1px solid #222" }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold text-white">{s.day}</p>
                  <p className="text-[9px]" style={{ color: "#777" }}>{s.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold" style={{ color: "#39FF14" }}>
                    {s.done}/{s.total}
                  </p>
                  <p className="text-[9px]" style={{ color: "#777" }}>RPE {s.rpe}</p>
                </div>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full" style={{ background: "#222" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: pct === 100 ? "#39FF14" : "rgba(57,255,20,0.45)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

const TABS = [
  { id: "path", icon: Dumbbell, label: "Scheda" },
  { id: "storico", icon: History, label: "Storico" },
  { id: "live", icon: CalendarCheck, label: "Live" },
  { id: "profilo", icon: User, label: "Profilo" },
];

const slideVariants = {
  enter: (dir) => ({ opacity: 0, x: dir > 0 ? 22 : -22 }),
  center: { opacity: 1, x: 0 },
  exit: (dir) => ({ opacity: 0, x: dir > 0 ? -22 : 22 }),
};

const SCREEN_DURATION = 4000;

// ─── Componente principale ────────────────────────────────────────────────────

export function AppPreview() {
  const [screenIdx, setScreenIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const active = SCREENS[screenIdx];

  useEffect(() => {
    const id = setInterval(() => {
      setDir(1);
      setScreenIdx((i) => (i + 1) % SCREENS.length);
    }, SCREEN_DURATION);
    return () => clearInterval(id);
  }, []);

  const goTo = (idx) => {
    if (idx === screenIdx) return;
    setDir(idx > screenIdx ? 1 : -1);
    setScreenIdx(idx);
  };

  return (
    /* Cornice telefono */
    <div
      className="relative mx-auto select-none"
      style={{
        width: 224,
        height: 448,
        borderRadius: 20,
        background: "#080808",
        border: "2.5px solid #252525",
        boxShadow:
          "0 0 0 1px #111, 0 28px 72px rgba(0,0,0,0.75), 0 0 48px rgba(57,255,20,0.05), inset 0 1px 0 rgba(255,255,255,0.04)",
        overflow: "hidden",
      }}
    >
      {/* pulsanti laterali */}
      {[{ l: -3, t: 82, h: 26 }, { l: -3, t: 116, h: 26 }].map((b, i) => (
        <div
          key={i}
          className="absolute"
          style={{ left: b.l, top: b.t, width: 3, height: b.h, borderRadius: "3px 0 0 3px", background: "#1c1c1c" }}
        />
      ))}
      <div
        className="absolute"
        style={{ right: -3, top: 98, width: 3, height: 46, borderRadius: "0 3px 3px 0", background: "#1c1c1c" }}
      />

      {/* schermo */}
      <div
        className="absolute inset-0 flex flex-col"
        style={{ background: "#0d0d0d", borderRadius: 36, overflow: "hidden" }}
      >
        {/* status bar */}
        <div className="flex shrink-0 items-center justify-between px-5 pt-3.5 pb-1">
          <span className="text-[10px] font-semibold tracking-tight text-white">9:41</span>
          {/* notch dinamico */}
          <div style={{ width: 68, height: 15, borderRadius: 10, background: "#080808" }} />
          {/* icone destra */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-end gap-px">
              {[3, 5, 7, 9].map((h, i) => (
                <div key={i} style={{ width: 2.5, height: h, borderRadius: 1, background: i < 3 ? "#39FF14" : "#2e2e2e" }} />
              ))}
            </div>
            <div className="flex items-center">
              <div style={{ width: 16, height: 8, borderRadius: 2.5, border: "1.5px solid #444", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 1.5, right: 4, background: "#39FF14", borderRadius: 1 }} />
              </div>
              <div style={{ width: 2, height: 4, background: "#444", borderRadius: "0 1px 1px 0", marginLeft: 0.5 }} />
            </div>
          </div>
        </div>

        {/* area schermata */}
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <AnimatePresence custom={dir} initial={false} mode="wait">
            <motion.div
              key={active}
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: [0.32, 0, 0.67, 0] }}
              className="absolute inset-0"
            >
              {active === "path" && <ScreenWorkoutPath />}
              {active === "live" && <ScreenLive />}
              {active === "storico" && <ScreenStorico />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* dot indicators */}
        <div className="flex shrink-0 items-center justify-center gap-1.5 py-1.5">
          {SCREENS.map((s, i) => (
            <motion.button
              key={s}
              onClick={() => goTo(i)}
              aria-label={`Vai a ${s}`}
              animate={{ width: screenIdx === i ? 18 : 5, background: screenIdx === i ? "#39FF14" : "#2e2e2e" }}
              transition={{ duration: 0.3 }}
              className="rounded-full"
              style={{ height: 5 }}
            />
          ))}
        </div>

        {/* bottom tab bar */}
        <div
          className="shrink-0"
          style={{ background: "rgba(10,10,10,0.96)", borderTop: "1px solid #1a1a1a", paddingBottom: 8 }}
        >
          <div className="flex items-end justify-around px-1 pt-1">
            {TABS.map((tab) => {
              const isActive = tab.id === active;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => goTo(SCREENS.indexOf(tab.id) !== -1 ? SCREENS.indexOf(tab.id) : screenIdx)}
                  className="relative flex flex-col items-center gap-0.5 pb-0.5 pt-1.5"
                  style={{ flex: 1 }}
                >
                  <Icon size={16} style={{ color: isActive ? "#39FF14" : "#3e3e3e" }} />
                  <span className="text-[7.5px] font-medium leading-none" style={{ color: isActive ? "#39FF14" : "#3e3e3e" }}>
                    {tab.label}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="tabDot"
                      className="mt-0.5 rounded-full"
                      style={{ width: 3, height: 3, background: "#39FF14" }}
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
