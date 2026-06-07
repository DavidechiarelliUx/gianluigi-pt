import { Check, ChevronLeft, Plus, Share, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const STEPS_IOS = [
  {
    icon: Smartphone,
    step: "1",
    title: "Apri da Safari",
    text: "Apri l'area cliente usando Safari su iPhone. Non Chrome o Firefox.",
  },
  {
    icon: Share,
    step: "2",
    title: 'Tocca "Condividi"',
    text: 'Premi l\'icona di condivisione nella barra in basso di Safari (quadrato con freccia su).',
  },
  {
    icon: Plus,
    step: "3",
    title: '"Aggiungi a Home"',
    text: 'Scorri la lista e scegli "Aggiungi alla schermata Home". Dai un nome e conferma.',
  },
  {
    icon: Check,
    step: "4",
    title: "Aperta come app",
    text: "Trova l'icona tra le tue app. Si apre a schermo intero, senza la barra del browser.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.4, delay: i * 0.07, ease: "easeOut" },
  }),
};

export default function ClientInstallApp() {
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
            Installa l'app
          </h1>
          <p className="text-xs text-text-muted">Aggiungila alla schermata Home</p>
        </div>
      </div>

      {/* Hero */}
      <motion.div
        variants={fadeUp} initial="hidden" animate="show" custom={0}
        className="rounded-2xl p-5 text-center"
        style={{ background: "rgba(57,255,20,0.06)", border: "1px solid rgba(57,255,20,0.2)" }}
      >
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ background: "rgba(57,255,20,0.1)", border: "1px solid rgba(57,255,20,0.25)" }}>
          <Smartphone size={32} className="text-accent" />
        </div>
        <h2 className="font-display text-lg font-bold uppercase">
          Nessuno store necessario
        </h2>
        <p className="mt-2 text-sm text-text-muted leading-relaxed">
          Questa è una Web App. Basta aggiungerla alla schermata Home e si comporta esattamente come un'app nativa, con icona e schermo intero.
        </p>
      </motion.div>

      {/* Steps iPhone */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={1}>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-text-muted">
          iPhone (Safari)
        </p>
        <div className="space-y-2">
          {STEPS_IOS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.step}
                variants={fadeUp} initial="hidden" animate="show" custom={1 + i * 0.5}
                className="flex items-start gap-3 rounded-xl p-4"
                style={{ background: "#111", border: "1px solid #1e1e1e" }}
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black"
                  style={{ background: "#39FF14", color: "#0a0a0a" }}
                >
                  {s.step}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm font-bold uppercase">{s.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-text-muted">{s.text}</p>
                </div>
                <Icon size={18} className="shrink-0 text-accent opacity-60" />
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Android */}
      <motion.div
        variants={fadeUp} initial="hidden" animate="show" custom={3}
        className="rounded-xl p-4"
        style={{ background: "#111", border: "1px solid #1e1e1e" }}
      >
        <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-text-muted">
          Android (Chrome)
        </p>
        <p className="text-sm text-text-muted leading-relaxed">
          Apri l'area cliente con <strong className="text-text">Chrome</strong>, tocca i tre puntini in alto a destra e scegli{" "}
          <strong className="text-text">"Aggiungi alla schermata Home"</strong> oppure{" "}
          <strong className="text-text">"Installa app"</strong> se disponibile. L'icona apparirà tra le tue app.
        </p>
      </motion.div>

      {/* Pro tip */}
      <motion.div
        variants={fadeUp} initial="hidden" animate="show" custom={3.5}
        className="rounded-xl p-4"
        style={{ background: "rgba(57,255,20,0.04)", border: "1px solid rgba(57,255,20,0.15)" }}
      >
        <p className="text-xs leading-relaxed" style={{ color: "hsl(var(--text-muted))" }}>
          <span className="font-bold" style={{ color: "#39FF14" }}>💡 Aggiornamenti automatici</span>{" "}
          — Non serve fare nulla. Ogni volta che apri l'app, carichi automaticamente l'ultima versione.
        </p>
      </motion.div>
    </div>
  );
}
