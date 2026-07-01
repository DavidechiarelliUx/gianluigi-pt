import { ChevronLeft, Lock, Mail, Server, Shield, Trash2, UserCheck } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const SECTIONS = [
  {
    icon: UserCheck,
    title: "Dati che raccogliamo",
    text: "Nome, email, telefono (opzionale), dati di allenamento (esercizi, carichi, RPE), sessioni completate e feedback. Nessun dato raccolto senza il tuo consenso.",
  },
  {
    icon: Server,
    title: "Come vengono usati",
    text: "I tuoi dati servono esclusivamente per gestire le schede di allenamento, l'accesso alla piattaforma e comunicarti aggiornamenti relativi al tuo abbonamento. Non li vendiamo né cediamo a terzi.",
  },
  {
    icon: Lock,
    title: "Sicurezza",
    text: "La piattaforma usa HTTPS ovunque. Le password sono cifrate con bcrypt. I pagamenti sono gestiti interamente da Stripe (PCI DSS Level 1). Nessun dato di carta di credito viene memorizzato sui nostri server.",
  },
  {
    icon: Trash2,
    title: "Cancellazione dati",
    text: "Puoi richiedere accesso, rettifica o cancellazione scrivendo a gianluigi@gianluigipt.it. Alcuni dati possono essere conservati per obblighi fiscali o tutela di diritti.",
  },
  {
    icon: Mail,
    title: "Email e comunicazioni",
    text: "Ti inviamo email solo per confermare acquisti, inviarti credenziali di accesso o notificarti scadenze abbonamento. Non facciamo spam né newsletter non richieste.",
  },
  {
    icon: Shield,
    title: "I tuoi diritti (GDPR)",
    text: "Hai diritto di accesso, rettifica, cancellazione e portabilità dei tuoi dati. Per esercitare questi diritti scrivi a gianluigi@gianluigipt.it con oggetto 'GDPR – Richiesta'.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.35, delay: i * 0.06, ease: "easeOut" },
  }),
};

export default function ClientPrivacy() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="rounded-full p-1.5 text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="font-display text-xl font-black uppercase leading-none">
            Privacy &amp; Sicurezza
          </h1>
          <p className="text-xs text-text-muted">Trattamento dei tuoi dati</p>
        </div>
      </div>

      {/* Intro */}
      <motion.div
        variants={fadeUp} initial="hidden" animate="show" custom={0}
        className="rounded-xl p-4"
        style={{ background: "rgba(57,255,20,0.05)", border: "1px solid rgba(57,255,20,0.15)" }}
      >
        <p className="text-sm leading-relaxed text-text-muted">
          Gianluigi PT raccoglie solo i dati strettamente necessari al funzionamento del servizio.
          Non utilizziamo tracker, non vendiamo dati, non facciamo pubblicità.
        </p>
      </motion.div>

      {/* Sections */}
      <div className="space-y-3">
        {SECTIONS.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.title}
              variants={fadeUp} initial="hidden" animate="show" custom={1 + i * 0.3}
              className="rounded-xl p-4"
              style={{ background: "#111", border: "1px solid #1e1e1e" }}
            >
              <div className="mb-2 flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: "rgba(57,255,20,0.1)" }}>
                  <Icon size={15} className="text-accent" />
                </div>
                <p className="font-display text-sm font-bold uppercase">{s.title}</p>
              </div>
              <p className="text-xs leading-relaxed text-text-muted">{s.text}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Footer */}
      <motion.div
        variants={fadeUp} initial="hidden" animate="show" custom={5}
        className="text-center text-[11px] text-text-muted"
      >
        <p>Titolare del trattamento: Gianluigi Chiarelli</p>
        <p className="mt-0.5">gianluigi@gianluigipt.it · P.IVA da inserire</p>
        <p className="mt-1">
          <a className="text-accent hover:underline" href="/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy policy completa</a>
          {" · "}
          <a className="text-accent hover:underline" href="/cookie-policy" target="_blank" rel="noopener noreferrer">Cookie policy</a>
        </p>
        <p className="mt-2 text-[10px]">Ultimo aggiornamento: luglio 2026</p>
      </motion.div>
    </div>
  );
}
