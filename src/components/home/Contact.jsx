import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Calendar, MessageCircle, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { contactSchema, REQUEST_TYPES } from "../../lib/contactSchema";
import { SectionHeader } from "../ui/SectionHeader";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { Button } from "../ui/Button";
import { cn } from "../../lib/utils";

const WHATSAPP =
  "https://wa.me/393000000000?text=Ciao%20Gianluigi%2C%20vorrei%20informazioni!";

function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-danger">{msg}</p>;
}

const DEFAULTS = { requestType: "personal_training", privacy: false, company: "" };

export function Contact() {
  // status: idle | loading | success | error
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(contactSchema), defaultValues: DEFAULTS });

  const requestType = watch("requestType");

  const onSubmit = async (data) => {
    setStatus("loading");
    setErrorMsg("");
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).catch(() => null);

    if (res && res.ok) {
      reset(DEFAULTS);
      setStatus("success");
      return;
    }
    let msg = "Invio non riuscito. Riprova o scrivimi su WhatsApp.";
    if (res) {
      const j = await res.json().catch(() => null);
      if (j?.error) msg = j.error;
    } else {
      msg = "Connessione assente. Scrivimi su WhatsApp.";
    }
    setErrorMsg(msg);
    setStatus("error");
  };

  /* ---- SUCCESS ---- */
  if (status === "success") {
    return (
      <div className="grid gap-10 lg:grid-cols-2">
        <SectionHeader
          eyebrow="Contatti"
          title="Richiesta inviata"
          subtitle="Grazie! Ti risponderò il prima possibile."
        />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center gap-4 rounded-xl border border-accent/40 bg-surface p-10 text-center shadow-glow-soft"
        >
          <CheckCircle2 size={48} className="text-accent" />
          <p className="font-display text-xl uppercase">Messaggio ricevuto</p>
          <p className="text-sm text-text-muted">
            Ti contatterò presto. Per urgenze, scrivimi su WhatsApp.
          </p>
          <Button variant="secondary" onClick={() => setStatus("idle")}>
            Invia un'altra richiesta
          </Button>
        </motion.div>
      </div>
    );
  }

  /* ---- FORM ---- */
  const loading = status === "loading";
  return (
    <div className="grid gap-10 lg:grid-cols-2">
      {/* Colonna sinistra: titolo + WhatsApp */}
      <div className="space-y-6">
        <SectionHeader
          eyebrow="Contatti"
          title="Iniziamo insieme"
          subtitle="Raccontami il tuo obiettivo: ti propongo il percorso giusto."
        />
        <div className="rounded-xl border border-border bg-surface p-6">
          <p className="text-sm text-text-muted">Preferisci scrivere subito?</p>
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-accent px-5 py-3 font-semibold text-text transition hover:bg-accent/10"
          >
            <MessageCircle size={18} className="text-accent" /> Scrivimi su WhatsApp
          </a>
        </div>
      </div>

      {/* Colonna destra: form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="space-y-5 rounded-xl border border-border bg-surface p-6"
      >
        {/* Honeypot (nascosto agli umani) */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute left-[-9999px] h-0 w-0 opacity-0"
          {...register("company")}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-text-muted">Nome *</label>
            <Input placeholder="Il tuo nome" error={!!errors.name} {...register("name")} />
            <FieldError msg={errors.name?.message} />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-text-muted">Email *</label>
            <Input type="email" placeholder="email@esempio.it" error={!!errors.email} {...register("email")} />
            <FieldError msg={errors.email?.message} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-text-muted">Telefono</label>
            <Input placeholder="(facoltativo)" error={!!errors.phone} {...register("phone")} />
            <FieldError msg={errors.phone?.message} />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-text-muted">Obiettivo</label>
            <Input placeholder="es. dimagrimento" error={!!errors.goal} {...register("goal")} />
            <FieldError msg={errors.goal?.message} />
          </div>
        </div>

        {/* Tipo richiesta (radio chips) */}
        <div>
          <label className="mb-2 block text-xs uppercase tracking-wide text-text-muted">Tipo di richiesta *</label>
          <div className="flex flex-wrap gap-2">
            {REQUEST_TYPES.map((r) => (
              <label
                key={r.value}
                className={cn(
                  "cursor-pointer rounded-full border px-4 py-2 text-sm transition",
                  requestType === r.value
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-text-muted hover:border-accent/50"
                )}
              >
                <input type="radio" value={r.value} className="sr-only" {...register("requestType")} />
                {r.label}
              </label>
            ))}
          </div>
          <FieldError msg={errors.requestType?.message} />
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-text-muted">Messaggio *</label>
          <Textarea rows={4} placeholder="Scrivi qui la tua richiesta..." error={!!errors.message} {...register("message")} />
          <FieldError msg={errors.message?.message} />
        </div>

        {/* Privacy */}
        <div>
          <label className="flex items-start gap-2 text-sm text-text-muted">
            <input type="checkbox" className="mt-0.5 accent-[hsl(var(--accent))]" {...register("privacy")} />
            <span>Accetto la privacy policy e il trattamento dei dati. *</span>
          </label>
          <FieldError msg={errors.privacy?.message} />
        </div>

        {/* Errore globale invio */}
        {status === "error" && (
          <div className="flex items-center gap-2 rounded-md border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-danger">
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Invio...
            </>
          ) : (
            <>
              <Calendar size={18} /> Invia richiesta
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
