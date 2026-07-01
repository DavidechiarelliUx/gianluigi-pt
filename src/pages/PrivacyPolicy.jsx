import { ShieldCheck } from "lucide-react";
import { MainLayout } from "../components/layout";
import { Container } from "../components/ui/Container";
import { Button } from "../components/ui/Button";

const UPDATED_AT = "luglio 2026";
const CONTROLLER = {
  name: "Gianluigi Chiarelli",
  vat: "[P.IVA da inserire]",
  email: "gianluigi@gianluigipt.it",
  address: "[indirizzo o sede da inserire]",
};

const sections = [
  {
    title: "Dati raccolti",
    body: "Il sito e l'app possono trattare nome, cognome, email, telefono, messaggi inviati, obiettivi di allenamento, dati account, ordini, stato pagamenti, abbonamenti, prenotazioni live, dati di allenamento, carichi, ripetizioni, RPE, feedback, misure corporee, eventuali foto e note inserite dal cliente.",
  },
  {
    title: "Finalita e basi giuridiche",
    body: "I dati sono usati per rispondere alle richieste, creare e gestire l'account, erogare schede e live, gestire pagamenti e abbonamenti, inviare comunicazioni transazionali e adempiere a obblighi fiscali o di legge. Le basi giuridiche possono essere esecuzione del contratto o misure precontrattuali, obbligo legale, legittimo interesse alla sicurezza del servizio e, quando necessario per dati particolari o comunicazioni non essenziali, consenso esplicito dell'interessato.",
  },
  {
    title: "Dati fitness e possibili dati particolari",
    body: "Obiettivi, misure corporee, foto, feedback fisici e note libere possono rivelare informazioni sullo stato fisico o di salute. Inserisci solo dati pertinenti al percorso. Il titolare deve confermare la base giuridica corretta e, se necessario, raccogliere consenso esplicito separato.",
  },
  {
    title: "Conservazione",
    body: "I dati di contatto sono conservati per il tempo necessario a gestire la richiesta. I dati account, allenamento e abbonamento sono conservati per la durata del rapporto e successivamente per i termini necessari a tutela di diritti, obblighi fiscali o richieste dell'interessato. I termini puntuali devono essere completati dal titolare in base alla propria organizzazione.",
  },
  {
    title: "Destinatari e servizi terzi",
    body: "I dati possono essere trattati da fornitori tecnici quali hosting Vercel, database Neon, Stripe per pagamenti, provider SMTP/email e, solo quando l'utente sceglie di usarli, WhatsApp, Instagram o servizi video indicati nelle live. Questi fornitori possono operare come responsabili, autonomi titolari o sub-responsabili a seconda del servizio.",
  },
  {
    title: "Trasferimenti fuori SEE",
    body: "Alcuni fornitori possono trattare dati fuori dallo Spazio Economico Europeo. Il titolare deve verificare DPA, clausole contrattuali standard, decisioni di adeguatezza o altri strumenti applicabili per ciascun provider.",
  },
  {
    title: "Diritti dell'interessato",
    body: "Puoi chiedere accesso, rettifica, cancellazione, limitazione, opposizione, portabilita e revoca del consenso quando applicabile. Puoi anche proporre reclamo al Garante per la protezione dei dati personali.",
  },
];

export default function PrivacyPolicy() {
  return (
    <MainLayout>
      <section className="border-b border-border bg-surface py-14">
        <Container className="max-w-4xl">
          <div className="flex items-center gap-3 text-accent">
            <ShieldCheck size={22} />
            <p className="text-sm font-semibold uppercase tracking-wide">Privacy</p>
          </div>
          <h1 className="mt-4 font-display text-display font-black uppercase">Privacy Policy</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-text-muted">
            Informativa ai sensi del Regolamento UE 2016/679. Questo testo deve essere validato
            e completato con i dati ufficiali del titolare prima della pubblicazione definitiva.
          </p>
          <div className="mt-6 rounded-md border border-warning/40 bg-warning/10 p-4 text-sm leading-6 text-warning">
            Dati da completare manualmente: P.IVA, indirizzo/sede, eventuale DPO, tempi di conservazione puntuali e provider effettivamente contrattualizzati.
          </div>
        </Container>
      </section>

      <section className="py-12">
        <Container className="max-w-4xl">
          <div className="rounded-md border border-border bg-surface p-5 text-sm leading-7 text-text-muted">
            <p><strong className="text-text">Titolare:</strong> {CONTROLLER.name}</p>
            <p><strong className="text-text">P.IVA:</strong> {CONTROLLER.vat}</p>
            <p><strong className="text-text">Contatto privacy:</strong> <a className="text-accent hover:underline" href={`mailto:${CONTROLLER.email}`}>{CONTROLLER.email}</a></p>
            <p><strong className="text-text">Sede:</strong> {CONTROLLER.address}</p>
            <p><strong className="text-text">Ultimo aggiornamento:</strong> {UPDATED_AT}</p>
          </div>

          <div className="mt-8 space-y-6">
            {sections.map((section) => (
              <article key={section.title} className="border-b border-border pb-6">
                <h2 className="font-display text-xl font-bold uppercase">{section.title}</h2>
                <p className="mt-3 text-sm leading-7 text-text-muted">{section.body}</p>
              </article>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button as="a" href={`mailto:${CONTROLLER.email}`} variant="secondary">Esercita i tuoi diritti</Button>
            <Button as="a" href="/cookie-policy" variant="ghost">Vai alla Cookie Policy</Button>
          </div>
        </Container>
      </section>
    </MainLayout>
  );
}
