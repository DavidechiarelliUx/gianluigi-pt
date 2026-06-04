import { useContext } from "react";
import { AuthContext } from "./auth-context";

/** Hook auth: const { user, isAuthenticated, isLoading, login, logout } = useAuth(); */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve essere usato dentro <AuthProvider>");
  return ctx;
}
