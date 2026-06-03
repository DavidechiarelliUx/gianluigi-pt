import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";

/**
 * Bottone WhatsApp flottante (in basso a destra), solo pagine pubbliche.
 * Numero/messaggio configurabili.
 */
export function WhatsAppButton({
  phone = "393000000000",
  message = "Ciao Gianluigi, vorrei informazioni!",
}) {
  const href = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contatta su WhatsApp"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.6, duration: 0.4 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-bg shadow-glow-neon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      <MessageCircle size={26} />
    </motion.a>
  );
}
