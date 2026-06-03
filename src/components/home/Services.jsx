import { motion } from "framer-motion";
import { UserCheck, ClipboardList, Wifi, Video, Flame, ArrowUpRight } from "lucide-react";
import { SectionHeader } from "../ui/SectionHeader";
import { Badge } from "../ui/Badge";

const SERVICES = [
  {
    icon: UserCheck,
    title: "Personal Training",
    text: "Sessioni 1:1 in studio, tecnica e intensità seguite da vicino.",
    featured: true,
  },
  {
    icon: ClipboardList,
    title: "Schede personalizzate",
    text: "Programmi costruiti sui tuoi obiettivi, aggiornati nel tempo.",
  },
  {
    icon: Wifi,
    title: "Coaching online",
    text: "Allenati ovunque, seguito a distanza con feedback costanti.",
  },
  {
    icon: Flame,
    title: "Trasformazione fisica",
    text: "Percorsi completi per dimagrimento, massa o ricomposizione.",
  },
  {
    icon: Video,
    title: "Sessioni live 1:1 e di gruppo",
    text: "Allenamenti dal vivo e classi online.",
    soon: true,
  },
];

function ServiceCard({ s, className }) {
  const Icon = s.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      className={
        "group relative flex flex-col rounded-lg border bg-surface p-6 transition-colors " +
        (s.featured ? "border-accent/40 shadow-glow-soft" : "border-border hover:border-accent") +
        " " + (className || "")
      }
    >
      <div className="mb-4 flex items-center justify-between">
        <Icon className="text-accent" size={s.featured ? 30 : 24} />
        {s.soon && <Badge variant="soon">Presto</Badge>}
        {!s.soon && (
          <ArrowUpRight
            size={18}
            className="text-text-muted transition-colors group-hover:text-accent"
          />
        )}
      </div>
      <h3 className={"font-display uppercase " + (s.featured ? "text-2xl" : "text-lg")}>
        {s.title}
      </h3>
      <p className="mt-2 text-sm text-text-muted">{s.text}</p>
    </motion.div>
  );
}

/** Sezione Servizi con layout asimmetrico (featured + griglia). */
export function Services() {
  const [featured, ...rest] = SERVICES;
  return (
    <>
      <SectionHeader
        eyebrow="Cosa offro"
        title="Servizi su misura"
        subtitle="Dallo studio al coaching online: un percorso per ogni obiettivo."
        align="center"
      />
      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        <ServiceCard s={featured} className="lg:row-span-2 lg:justify-end" />
        {rest.map((s) => (
          <ServiceCard key={s.title} s={s} />
        ))}
      </div>
    </>
  );
}
