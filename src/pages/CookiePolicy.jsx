import { Database, SlidersHorizontal } from "lucide-react";
import { MainLayout } from "../components/layout";
import { Container } from "../components/ui/Container";
import { Button } from "../components/ui/Button";

const storageItems = [
  {
    name: "gpt_session",
    type: "Cookie httpOnly",
    purpose: "Mantiene l'accesso all'area cliente o dashboard admin.",
    duration: "7 giorni",
    category: "Tecnico",
    consent: "No",
  },
  {
    name: "Avatar cliente",
    type: "localStorage",
    purpose: "Memorizza nel browser l'URL dell'avatar scelto dal cliente.",
    duration: "Fino a rimozione manuale, logout o cancellazione dati browser.",
    category: "Preferenza tecnica",
    consent: "No",
  },
  {
    name: "Bozza allenamento",
    type: "sessionStorage",
    purpose: "Conserva temporaneamente i dati inseriti durante una sessione di allenamento.",
    duration: "Fino alla chiusura della scheda/browser.",
    category: "Tecnico",
    consent: "No",
  },
  {
    name: "Stripe Checkout",
    type: "Cookie/strumenti di terza parte su dominio Stripe",
    purpose: "Pagamento, sicurezza, antifrode e completamento della transazione.",
    duration: "Gestita da Stripe.",
    category: "Tecnico pagamento",
    consent: "No per pagamento richiesto dall'utente",
  },
];

export default function CookiePolicy() {
  return (
    <MainLayout>
      <section className="border-b border-border bg-surface py-14">
        <Container className="max-w-4xl">
          <div className="flex items-center gap-3 text-accent">
            <Database size={22} />
            <p className="text-sm font-semibold uppercase tracking-wide">Cookie e storage</p>
          </div>
          <h1 className="mt-4 font-display text-display font-black uppercase">Cookie Policy</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-text-muted">
            Questa applicazione non usa analytics, pixel pubblicitari o cookie di profilazione nel codice analizzato.
            Usa solo strumenti tecnici necessari al funzionamento, oltre ai servizi terzi attivati dall'utente.
          </p>
        </Container>
      </section>

      <section className="py-12">
        <Container className="max-w-5xl">
          <div className="overflow-hidden rounded-md border border-border bg-surface">
            <div className="grid grid-cols-1 gap-px bg-border text-sm md:grid-cols-[1fr_1fr_1.6fr_1fr_1fr_0.8fr]">
              {["Nome", "Tipo", "Finalita", "Durata", "Categoria", "Consenso"].map((header) => (
                <div key={header} className="bg-surface-2 p-3 font-semibold text-text">{header}</div>
              ))}
              {storageItems.map((item) => (
                <div key={item.name} className="contents">
                  <div className="bg-surface p-3 font-semibold text-text">{item.name}</div>
                  <div className="bg-surface p-3 text-text-muted">{item.type}</div>
                  <div className="bg-surface p-3 text-text-muted">{item.purpose}</div>
                  <div className="bg-surface p-3 text-text-muted">{item.duration}</div>
                  <div className="bg-surface p-3 text-text-muted">{item.category}</div>
                  <div className="bg-surface p-3 text-text-muted">{item.consent}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 rounded-md border border-border bg-surface p-5">
            <div className="flex items-center gap-3 text-accent">
              <SlidersHorizontal size={18} />
              <h2 className="font-display text-lg font-bold uppercase text-text">Preferenze</h2>
            </div>
            <p className="mt-3 text-sm leading-7 text-text-muted">
              Al momento non sono presenti categorie opzionali da accettare o rifiutare. Se in futuro saranno
              aggiunti analytics, pixel marketing, mappe, video embed o altri strumenti non tecnici, verranno
              bloccati preventivamente e sara mostrato un pannello di preferenze con scelta granulare.
            </p>
            <p className="mt-3 text-sm leading-7 text-text-muted">
              Puoi cancellare cookie e dati locali dalle impostazioni del browser. Per richieste sui dati personali,
              scrivi a <a className="text-accent hover:underline" href="mailto:gianluigi@gianluigipt.it">gianluigi@gianluigipt.it</a>.
            </p>
          </div>

          <div className="mt-10">
            <Button as="a" href="/privacy-policy" variant="secondary">Leggi la Privacy Policy</Button>
          </div>
        </Container>
      </section>
    </MainLayout>
  );
}
