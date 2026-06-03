import { motion } from "framer-motion";
import { User, Users, Video, Clock } from "lucide-react";
import { SectionHeader } from "../ui/SectionHeader";
import { Badge } from "../ui/Badge";

const SLOTS = [
  { day: "GIO", date: "5", time: "18:00", label: "1:1 · libero", free: true },
  { day: "GIO", date: "5", time: "19:00", label: "Classe HIIT", free: true },
  { day: "VEN", date: "6", time: "07:30", label: "1:1 · libero", free: true },
  { day: "VEN", date: "6", time: "18:00", label: "Completo", free: false },
];

/** Mini calendario/slot costruito in UI (no stock). */
function SlotBoard() {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-display text-sm font-bold uppercase">Disponibilità</p>
        <span className="text-xs text-text-muted">Giugno</span>
      </div>
      <div className="space-y-2">
        {SLOTS.map((s) => (
          <div
            key={s.day + s.time}
            className={
              "flex items-center gap-3 rounded-md border px-3 py-2.5 " +
              (s.free ? "border-accent/40 bg-bg" : "border-border bg-surface-2 opacity-60")
            }
          >
            <div className="flex w-12 shrink-0 flex-col items-center rounded-sm bg-surface-2 py-1">
              <span className="text-[10px] uppercase text-text-muted">{s.day}</span>
              <span className="font-display text-lg font-bold leading-none">{s.date}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-text-muted">
              <Clock size={14} /> {s.time}
            </div>
            <span className={"ml-auto text-xs " + (s.free ? "text-accent" : "text-text-muted")}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const TYPES = [
  { icon: User, title: "Sessioni 1:1", text: "Allenamento individuale dal vivo, correzioni in tempo reale." },
  { icon: Users, title: "Classi di gruppo", text: "Energia di gruppo, orari fissi, posti limitati." },
  { icon: Video, title: "Link videochiamata", text: "Prima versione con link Zoom/Meet manuale; integrazione in arrivo." },
];

/** Anteprima Sessioni live 1:1 e di gruppo (Fase 3). */
export function PreviewLive() {
  return (
    <>
      <SectionHeader
        eyebrow="In arrivo · Sessioni live"
        title="Allenati dal vivo, anche a distanza"
        subtitle="Sessioni individuali e classi di gruppo, prenotabili dal calendario."
        align="center"
      />
      <div className="mt-10 grid items-center gap-12 lg:grid-cols-2">
        <div className="space-y-4">
          <Badge variant="soon">Fase 3</Badge>
          <ul className="space-y-3">
            {TYPES.map((t, i) => {
              const Icon = t.icon;
              return (
                <motion.li
                  key={t.title}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="flex gap-4 rounded-lg border border-border bg-surface p-4"
                >
                  <Icon className="mt-0.5 shrink-0 text-accent" size={22} />
                  <div>
                    <h3 className="font-display text-base font-bold uppercase">{t.title}</h3>
                    <p className="mt-1 text-sm text-text-muted">{t.text}</p>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative"
        >
          <div aria-hidden className="absolute -inset-6 -z-10 rounded-full bg-accent-2/10 blur-[80px]" />
          <SlotBoard />
        </motion.div>
      </div>
    </>
  );
}
