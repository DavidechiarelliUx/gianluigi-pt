import {
  CheckCircle2,
  Clock3,
  ClipboardList,
  Mail,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { MainLayout, Section } from "../components/layout";
import { Container } from "../components/ui/Container";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Contact } from "../components/home";

const WHATSAPP =
  "https://wa.me/393000000000?text=Ciao%20Gianluigi%2C%20vorrei%20prenotare%20una%20consulenza.";

const INFO = [
  {
    icon: Clock3,
    title: "Risposta rapida",
    text: "Di solito ricevi una risposta entro 24/48 ore con il prossimo passo più adatto.",
  },
  {
    icon: ClipboardList,
    title: "Cosa scrivere",
    text: "Obiettivo, esperienza, disponibilità, eventuali dolori o limiti e se preferisci app, live o 1:1.",
  },
  {
    icon: ShieldCheck,
    title: "Percorso chiaro",
    text: "Dopo il primo contatto scegli il pacchetto, ricevi accesso all'app e inizi con una valutazione.",
  },
];

export default function ContactPage() {
  return (
    <MainLayout>
      <section className="pt-32 pb-12">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <SectionHeader
              eyebrow="Contatti"
              title="Prenota consulenza"
              subtitle="Usa il form per raccontare il tuo obiettivo oppure scrivi direttamente su WhatsApp. Qui parte il percorso: valutazione, pacchetto giusto e accesso all'app."
              align="center"
            />
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button as="a" href="#form-contatto">
                <Mail size={18} /> Compila il form
              </Button>
              <Button as="a" href={WHATSAPP} target="_blank" rel="noopener noreferrer" variant="secondary">
                <MessageCircle size={18} /> WhatsApp
              </Button>
            </div>
          </div>
        </Container>
      </section>

      <Section id="form-contatto" surface>
        <Contact />
      </Section>

      <Section>
        <SectionHeader
          eyebrow="Come funziona"
          title="Prima del primo allenamento"
          subtitle="Poche informazioni fatte bene permettono di scegliere il percorso migliore senza perdere tempo."
          align="center"
        />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {INFO.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title}>
                <Icon className="mb-5 text-accent" size={30} />
                <h2 className="font-display text-lg font-bold uppercase">{item.title}</h2>
                <p className="mt-3 text-sm leading-6 text-text-muted">{item.text}</p>
              </Card>
            );
          })}
        </div>

        <Card className="mt-6 border-accent/35 bg-accent/5">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 font-display text-lg font-bold uppercase">
                <CheckCircle2 size={22} className="text-accent" />
                Hai già scelto un pacchetto?
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
                Se hai già acquistato, indica nel messaggio l'email usata per il pagamento:
                controllo l'ordine e ti confermo l'accesso all'area cliente.
              </p>
            </div>
            <Button as="a" href="/pacchetti" variant="secondary" className="shrink-0">
              Vedi pacchetti
            </Button>
          </div>
        </Card>
      </Section>
    </MainLayout>
  );
}
