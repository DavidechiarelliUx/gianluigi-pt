import { Share, Smartphone, Plus, Check } from "lucide-react";
import { MainLayout } from "../components/layout/MainLayout";
import { Container } from "../components/ui/Container";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";

const STEPS = [
  { icon: Smartphone, title: "Apri Safari", text: "Apri il link dell'area cliente da iPhone usando Safari." },
  { icon: Share, title: "Premi Condividi", text: "Tocca l'icona di condivisione nella barra in basso." },
  { icon: Plus, title: "Aggiungi alla Home", text: "Scegli “Aggiungi alla schermata Home” e conferma." },
  { icon: Check, title: "Usala come app", text: "Troverai Gianluigi PT tra le app del telefono." },
];

export default function InstallApp() {
  return (
    <MainLayout>
      <section className="py-section">
        <Container>
          <SectionHeader
            eyebrow="Web app"
            title="Aggiungi Gianluigi PT alla schermata Home"
            subtitle="Non serve Apple Store: apri il sito da Safari e salvalo tra le app. Gli aggiornamenti arrivano automaticamente."
            align="center"
          />

          <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <Card key={step.title} className="relative">
                  <Badge variant="neon" className="mb-5">
                    Step {index + 1}
                  </Badge>
                  <Icon className="mb-5 text-accent" size={30} />
                  <h2 className="font-display text-lg font-bold uppercase">{step.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-text-muted">{step.text}</p>
                </Card>
              );
            })}
          </div>

          <Card className="mx-auto mt-10 max-w-3xl border-accent/30 bg-surface-2 text-center">
            <h2 className="font-display text-2xl font-black uppercase">Per Android</h2>
            <p className="mt-3 text-text-muted">
              Apri il link da Chrome, premi il menu con i tre puntini e scegli “Aggiungi a schermata Home”
              o “Installa app”, se disponibile.
            </p>
          </Card>
        </Container>
      </section>
    </MainLayout>
  );
}
