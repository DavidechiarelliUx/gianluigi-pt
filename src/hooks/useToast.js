import { useContext } from "react";
import { ToastContext } from "../components/app/toast-context";

/** Hook per mostrare toast: const { toast } = useToast(); toast({type,title,description}). */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast deve essere usato dentro <ToastProvider>");
  return ctx;
}
