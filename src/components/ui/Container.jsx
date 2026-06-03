import { cn } from "../../lib/utils";

/** Contenitore centrato con max-width e padding orizzontale coerenti. */
export function Container({ className, children, ...props }) {
  return (
    <div
      className={cn("mx-auto w-full max-w-6xl px-6", className)}
      {...props}
    >
      {children}
    </div>
  );
}
