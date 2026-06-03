import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

/**
 * Card animata: entra in viewport con fade + slide-up e si solleva in hover.
 * delay (s) per effetto stagger tra più card.
 */
export function MotionCard({ delay = 0, className, children, ...props }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
      whileHover={{ y: -4 }}
      className={cn(
        "rounded-lg border border-border bg-surface p-6 shadow-base transition-colors hover:border-accent",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
