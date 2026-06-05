import { motion } from "framer-motion";
import { Dumbbell, Target, HeartPulse } from "lucide-react";
import { SectionHeader } from "../ui/SectionHeader";
import gianluigiPhoto from "../../assets/gianluigi-chiarelli.webp";

const PILLARS = [
  { icon: Target, title: "Metodo", text: "Programmazione basata su dati, non su sensazioni." },
  { icon: Dumbbell, title: "Disciplina", text: "Costanza guidata, obiettivi misurabili nel tempo." },
  { icon: HeartPulse, title: "Su misura", text: "Ogni percorso è costruito sul tuo corpo e sulla tua vita." },
];

/** Sezione "Chi sono": autorevole ma umana, con visual geometrico in UI. */
export function About() {
  return (
    <div className="grid grid-cols-[minmax(104px,0.42fr)_minmax(0,0.58fr)] items-start gap-4 sm:gap-8 lg:grid-cols-2 lg:items-center lg:gap-12">
      {/* Visual: foto reale, compatta su mobile e più importante su desktop */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative mx-auto w-full min-w-[104px] max-w-[138px] self-start sm:max-w-[220px] lg:max-w-md"
      >
        <div aria-hidden className="absolute -bottom-6 -right-6 -z-10 h-28 w-28 rounded-full bg-accent/20 blur-[50px] lg:-bottom-10 lg:-right-10 lg:h-48 lg:w-48 lg:blur-[80px]" />
        <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-border bg-surface sm:rounded-xl">
          {/* Foto reale di Gianluigi */}
          <img
            src={gianluigiPhoto}
            alt="Gianluigi Chiarelli, personal trainer"
            width={941}
            height={1672}
            loading="lazy"
            className="h-full w-full object-cover object-top"
          />
          {/* gradiente in basso per leggibilità etichetta */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-bg via-bg/60 to-transparent"
          />
          {/* etichetta */}
          <div className="absolute bottom-1.5 left-1.5 right-1.5 rounded-md border border-border bg-bg/80 px-2 py-1 backdrop-blur sm:bottom-2 sm:left-2 sm:right-2 sm:py-1.5 lg:bottom-4 lg:left-4 lg:right-auto lg:px-3 lg:py-2">
            <p className="text-[10px] font-semibold leading-tight lg:text-sm">Gianluigi Chiarelli</p>
            <p className="text-[8px] text-text-muted sm:text-[9px] lg:text-xs">Personal Trainer · Coach</p>
          </div>
        </div>
      </motion.div>

      {/* Testo */}
      <div className="min-w-0 space-y-3 sm:space-y-4 lg:space-y-6">
        <SectionHeader
          eyebrow="Chi sono"
          title="Allenare è una responsabilità"
          className="[&>h2]:text-xl [&>span]:text-[10px] sm:[&>h2]:text-3xl sm:[&>span]:text-[11px] lg:[&>h2]:text-display lg:[&>span]:text-sm"
        />
        <div className="space-y-2 text-xs text-text-muted sm:space-y-3 sm:text-sm lg:space-y-4 lg:text-base">
          <p>
            Sono <span className="text-text">Gianluigi Chiarelli</span>, personal
            trainer e coach. Da oltre dieci anni accompagno persone reali verso
            trasformazioni reali — in studio e online.
          </p>
          <p>
            Non vendo scorciatoie: costruisco <span className="text-text">metodo</span>.
            Ogni programma nasce da una valutazione seria e si adatta nel tempo,
            perché il corpo cambia e l'allenamento deve cambiare con lui.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3 lg:gap-4">
          {PILLARS.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="rounded-lg border border-border bg-surface p-2.5 sm:p-3 lg:p-4"
              >
                <Icon className="mb-1.5 text-accent sm:mb-2" size={18} />
                <h3 className="font-display text-xs font-bold uppercase lg:text-sm">{p.title}</h3>
                <p className="mt-1 hidden text-[11px] leading-4 text-text-muted sm:block lg:text-xs lg:leading-5">{p.text}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
