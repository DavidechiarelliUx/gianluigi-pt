import { MainLayout, Section } from "./components/layout";
import {
  Hero,
  About,
  Services,
  Results,
} from "./components/home";

/** Home marketing essenziale: hero, chi sono, servizi principali e risultati. */
export default function App() {
  return (
    <MainLayout>
      <Hero />

      <Section id="chi-sono">
        <About />
      </Section>

      <Section id="servizi" surface>
        <Services />
      </Section>

      <Section id="risultati">
        <Results />
      </Section>
    </MainLayout>
  );
}
