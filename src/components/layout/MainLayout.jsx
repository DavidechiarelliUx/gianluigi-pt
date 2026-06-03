import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { WhatsAppButton } from "./WhatsAppButton";

/** Layout pubblico: navbar fixed + contenuto + footer + WhatsApp flottante. */
export function MainLayout({ children }) {
  return (
    <div id="top" className="min-h-screen bg-bg text-text">
      <Navbar />
      <main className="pt-16">{children}</main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
