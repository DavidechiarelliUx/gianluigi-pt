import { Dumbbell, AtSign, Mail, MessageCircle } from "lucide-react";
import { Container } from "../ui/Container";

const SOCIALS = [
  { label: "Instagram", href: "https://instagram.com/", icon: AtSign },
  { label: "WhatsApp", href: "https://wa.me/", icon: MessageCircle },
  { label: "Email", href: "mailto:info@gianluigipt.it", icon: Mail },
];

/** Footer con brand, social e linea neon sottile. */
export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      {/* linea neon sottile */}
      <div className="h-px w-full bg-neon-gradient opacity-40" />
      <Container className="flex flex-col items-center justify-between gap-6 py-10 sm:flex-row">
        <a
          href="#top"
          className="flex items-center gap-2 font-display text-lg font-bold uppercase"
        >
          <Dumbbell size={20} className="text-accent" />
          Gianluigi <span className="text-accent">PT</span>
        </a>

        <nav className="flex items-center gap-5">
          {SOCIALS.map((s) => {
            const Icon = s.icon;
            return (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="text-text-muted transition-colors hover:text-accent"
              >
                <Icon size={20} />
              </a>
            );
          })}
        </nav>

        <p className="text-sm text-text-muted">
          © {new Date().getFullYear()} Gianluigi Chiarelli
        </p>
      </Container>
    </footer>
  );
}
