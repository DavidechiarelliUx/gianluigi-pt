import { motion } from "framer-motion";
import { UserCheck, Smartphone, Video, ArrowUpRight } from "lucide-react";
import { SectionHeader } from "../ui/SectionHeader";

const SERVICES = [
  {
    icon: Smartphone,
    title: "Applicazione personale",
    text: "Schede, tracking, progressi, timer recupero e messaggi diretti al coach.",
    href: "/app",
  },
  {
    icon: Video,
    title: "Live di gruppo",
    text: "Allenamenti online, classi a posti limitati e calendario prenotazioni.",
    href: "/app#live",
  },
  {
    icon: UserCheck,
    title: "Personal training 1:1 / online",
    text: "Percorso individuale, tecnica, coaching e adattamento continuo del piano.",
    href: "/pacchetti",
  },
];

function ServiceCard({ s, index }) {
  const Icon = s.icon;
  return (
    <motion.a
      href={s.href}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, ease: "easeOut", delay: index * 0.08 }}
      whileHover={{ y: -4 }}
      className="group relative flex min-h-[240px] flex-col rounded-lg border border-border bg-surface p-6 transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      <div className="mb-4 flex items-center justify-between">
        <Icon className="text-accent" size={28} />
        <ArrowUpRight
          size={18}
          className="text-text-muted transition-colors group-hover:text-accent"
        />
      </div>
      <h3 className="font-display text-xl uppercase">{s.title}</h3>
      <p className="mt-2 text-sm text-text-muted">{s.text}</p>
      <span className="mt-auto pt-6 text-sm font-semibold text-accent transition-colors group-hover:text-text">
        Scopri di più
      </span>
    </motion.a>
  );
}

/** Sezione Servizi principale: solo tre scelte chiare. */
export function Services() {
  return (
    <>
      <SectionHeader
        eyebrow="Servizi principali"
        title="Scegli come iniziare"
        subtitle="Un percorso semplice: app personale, live di gruppo o coaching diretto 1:1."
        align="center"
      />
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {SERVICES.map((s, index) => (
          <ServiceCard key={s.title} s={s} index={index} />
        ))}
      </div>
    </>
  );
}
