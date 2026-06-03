import { motion } from "framer-motion";
import { Container } from "../ui/Container";
import { cn } from "../../lib/utils";

/**
 * Sezione riutilizzabile: padding verticale coerente + reveal on-scroll.
 * id per ancore di navigazione. surface=true usa sfondo leggermente più chiaro.
 */
export function Section({ id, surface = false, className, children, ...props }) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-20 py-16 sm:py-section",
        surface && "bg-surface",
        className
      )}
      {...props}
    >
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </Container>
    </section>
  );
}
